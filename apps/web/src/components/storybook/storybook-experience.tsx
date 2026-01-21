"use client";

import { env } from "@web/env";
import { trpc } from "@web/trpc/react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Story = {
  id: string;
  title: string | null;
  theme: string;
  status: "in_progress" | "awaiting_title" | "completed";
  coverImageUrl: string | null;
  titleOptions: string[] | null;
};

type StoryChoice = {
  id: string;
  text: string;
  imageUrl: string | null;
};

type StoryPage = {
  id: string;
  pageNumber: number;
  text: string;
  imageUrl: string | null;
  audioUrl: string | null;
  choices: StoryChoice[];
};

type StoryModels = {
  text?: string;
  image?: string;
  audio?: string;
};

type StoryStreamEvent =
  | {
      type: "start";
      pageNumber: number;
      models: StoryModels;
    }
  | {
      type: "llm_token";
      text: string;
    }
  | {
      type: "text_segment";
      id: string;
      sequenceNumber: number;
      text: string;
    }
  | {
      type: "audio_chunk";
      sequenceNumber: number;
      audioFormat: string;
      data: string;
    }
  | {
      type: "audio_end";
      sequenceNumber: number;
    }
  | {
      type: "complete";
      page: StoryPage | null;
      story: Story;
      isEnd: boolean;
      titleOptions: string[];
      models: StoryModels;
    }
  | {
      type: "error";
      message: string;
    };

type StreamRequest = {
  storyId: string;
  choiceId?: string | null;
};

export default function StorybookExperience({
  initialStoryId,
}: {
  initialStoryId?: string;
}) {
  const utils = trpc.useUtils();
  const [storyId, setStoryId] = useState<string | null>(initialStoryId ?? null);
  const [story, setStory] = useState<Story | null>(null);
  const [pages, setPages] = useState<StoryPage[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [titleOptions, setTitleOptions] = useState<string[]>([]);
  const [models, setModels] = useState<StoryModels | null>(null);
  const [mediaLoading, setMediaLoading] = useState<Set<string>>(
    () => new Set(),
  );
  const [streamEvents, setStreamEvents] = useState<StoryStreamEvent[]>([]);
  const [streamRequest, setStreamRequest] = useState<StreamRequest | null>(
    null,
  );
  const [streamError, setStreamError] = useState<string | null>(null);
  const [animatedText, setAnimatedText] = useState("");
  const [animationTarget, setAnimationTarget] = useState("");
  const [isAnimatingText, setIsAnimatingText] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [hasStreamingAudio, setHasStreamingAudio] = useState(false);
  const [streamedAudioPageId, setStreamedAudioPageId] = useState<string | null>(
    null,
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const audioStateRef = useRef<{
    segments: Map<number, { chunks: Uint8Array[]; done: boolean }>;
    currentSequence: number;
    bufferedBytes: number;
    started: boolean;
    mimeType: string | null;
    objectUrl: string | null;
  }>({
    segments: new Map(),
    currentSequence: 1,
    bufferedBytes: 0,
    started: false,
    mimeType: null,
    objectUrl: null,
  });

  const storyQuery = trpc.story.get.useQuery(
    { storyId: storyId ?? "" },
    {
      enabled:
        Boolean(storyId) && pages.length === 0 && !streamRequest?.storyId,
    },
  );

  const startStory = trpc.story.start.useMutation({
    onSuccess: async () => {
      await utils.story.list.invalidate();
    },
  });
  const generateMedia = trpc.story.generateMedia.useMutation();
  const finishStory = trpc.story.finish.useMutation({
    onSuccess: async () => {
      await utils.story.list.invalidate();
    },
  });

  const bufferThresholdBytes = 24000;

  const pumpAudio = useCallback(() => {
    const sourceBuffer = sourceBufferRef.current;
    const state = audioStateRef.current;
    if (!sourceBuffer || sourceBuffer.updating) return;
    const segment = state.segments.get(state.currentSequence);
    if (!segment || segment.chunks.length === 0) return;

    const chunk = segment.chunks.shift();
    if (!chunk) return;
    try {
      const buffer = chunk.buffer.slice(
        chunk.byteOffset,
        chunk.byteOffset + chunk.byteLength,
      ) as ArrayBuffer;
      sourceBuffer.appendBuffer(buffer);
      state.bufferedBytes += chunk.byteLength;
    } catch {
      return;
    }

    if (segment.chunks.length === 0 && segment.done) {
      state.segments.delete(state.currentSequence);
      state.currentSequence += 1;
    }

    const audio = audioRef.current;
    if (
      audio &&
      !state.started &&
      state.bufferedBytes >= bufferThresholdBytes
    ) {
      audio.play().catch(() => undefined);
      state.started = true;
    }
  }, []);

  const resetStreamingAudio = useCallback(() => {
    const state = audioStateRef.current;
    state.segments.clear();
    state.currentSequence = 1;
    state.bufferedBytes = 0;
    state.started = false;
    state.mimeType = null;
    setHasStreamingAudio(false);

    if (sourceBufferRef.current) {
      sourceBufferRef.current.removeEventListener("updateend", pumpAudio);
    }

    if (mediaSourceRef.current) {
      try {
        if (mediaSourceRef.current.readyState === "open") {
          mediaSourceRef.current.endOfStream();
        }
      } catch {
        // Ignore stream cleanup errors.
      }
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }

    if (state.objectUrl) {
      URL.revokeObjectURL(state.objectUrl);
      state.objectUrl = null;
    }

    mediaSourceRef.current = null;
    sourceBufferRef.current = null;
  }, [pumpAudio]);

  const resolveMimeType = useCallback((format: string) => {
    if (format === "mp3" || format === "mpeg") return "audio/mpeg";
    if (format === "aac") return "audio/aac";
    if (format === "wav") return "audio/wav";
    return "audio/ogg; codecs=opus";
  }, []);

  const ensureMediaSource = useCallback(() => {
    if (mediaSourceRef.current || !audioRef.current) return;
    const mediaSource = new MediaSource();
    mediaSourceRef.current = mediaSource;
    const objectUrl = URL.createObjectURL(mediaSource);
    audioStateRef.current.objectUrl = objectUrl;
    audioRef.current.src = objectUrl;
  }, []);

  const ensureSourceBuffer = useCallback(() => {
    const mediaSource = mediaSourceRef.current;
    const mimeType = audioStateRef.current.mimeType;
    if (!mediaSource || !mimeType || sourceBufferRef.current) return;

    const createBuffer = () => {
      if (sourceBufferRef.current) return;
      if (!MediaSource.isTypeSupported(mimeType)) {
        return;
      }
      const buffer = mediaSource.addSourceBuffer(mimeType);
      buffer.mode = "sequence";
      buffer.addEventListener("updateend", pumpAudio);
      sourceBufferRef.current = buffer;
      pumpAudio();
    };

    if (mediaSource.readyState === "open") {
      createBuffer();
    } else {
      const onOpen = () => {
        mediaSource.removeEventListener("sourceopen", onOpen);
        createBuffer();
      };
      mediaSource.addEventListener("sourceopen", onOpen);
    }
  }, [pumpAudio]);

  const ensureSegment = useCallback((sequenceNumber: number) => {
    const state = audioStateRef.current;
    if (!state.segments.has(sequenceNumber)) {
      state.segments.set(sequenceNumber, { chunks: [], done: false });
    }
  }, []);

  const enqueueAudioChunk = useCallback(
    (sequenceNumber: number, audioFormat: string, data: string) => {
      ensureMediaSource();
      const state = audioStateRef.current;
      if (!state.mimeType) {
        state.mimeType = resolveMimeType(audioFormat);
      }
      ensureSourceBuffer();
      setHasStreamingAudio(true);

      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }

      const segment = state.segments.get(sequenceNumber) ?? {
        chunks: [],
        done: false,
      };
      segment.chunks.push(bytes);
      state.segments.set(sequenceNumber, segment);
      pumpAudio();
    },
    [ensureMediaSource, ensureSourceBuffer, pumpAudio, resolveMimeType],
  );

  const markAudioEnd = useCallback(
    (sequenceNumber: number) => {
      const state = audioStateRef.current;
      const segment = state.segments.get(sequenceNumber) ?? {
        chunks: [],
        done: false,
      };
      segment.done = true;
      state.segments.set(sequenceNumber, segment);
      pumpAudio();
    },
    [pumpAudio],
  );

  useEffect(() => {
    if (!storyQuery.data) return;
    setStory(storyQuery.data.story as Story);
    setPages(storyQuery.data.pages as StoryPage[]);
    setCurrentPage(0);
    setTitleOptions(storyQuery.data.story.titleOptions ?? []);
    setStreamRequest(null);
    setStreamActive(false);
    setPageReady(true);
  }, [storyQuery.data]);

  useEffect(() => {
    return () => resetStreamingAudio();
  }, [resetStreamingAudio]);

  useEffect(() => {
    if (!streamRequest?.storyId) {
      setStreamEvents([]);
      setStreamError(null);
      setStreamActive(false);
      return;
    }

    const controller = new AbortController();

    const runStream = async () => {
      const url = new URL("/story/stream", env.NEXT_PUBLIC_API_BASE_URL);
      url.searchParams.set("storyId", streamRequest.storyId);
      if (streamRequest.choiceId) {
        url.searchParams.set("choiceId", streamRequest.choiceId);
      }

      setStreamEvents([]);
      setStreamError(null);
      setAnimatedText("");
      setAnimationTarget("");
      setIsAnimatingText(true);
      setStreamActive(true);
      setPageReady(false);
      setStreamedAudioPageId(null);
      resetStreamingAudio();

      const response = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Stream request failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const event = JSON.parse(trimmed) as StoryStreamEvent;
          setStreamEvents((prev) => [...prev, event]);
          if (event.type === "text_segment") {
            ensureSegment(event.sequenceNumber);
          }
          if (event.type === "audio_chunk") {
            enqueueAudioChunk(
              event.sequenceNumber,
              event.audioFormat,
              event.data,
            );
          }
          if (event.type === "audio_end") {
            markAudioEnd(event.sequenceNumber);
          }
          if (event.type === "error") {
            setStreamError(event.message);
            setIsAnimatingText(false);
            controller.abort();
            return;
          }
        }
      }

      const tail = buffer.trim();
      if (tail) {
        try {
          const event = JSON.parse(tail) as StoryStreamEvent;
          setStreamEvents((prev) => [...prev, event]);
          if (event.type === "text_segment") {
            ensureSegment(event.sequenceNumber);
          }
          if (event.type === "audio_chunk") {
            enqueueAudioChunk(
              event.sequenceNumber,
              event.audioFormat,
              event.data,
            );
          }
          if (event.type === "audio_end") {
            markAudioEnd(event.sequenceNumber);
          }
          if (event.type === "error") {
            setStreamError(event.message);
            setIsAnimatingText(false);
          }
        } catch {
          // Ignore malformed tail data.
        }
      }
    };

    void runStream()
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setStreamError("Nao foi possivel continuar a historia.");
        setIsAnimatingText(false);
      })
      .finally(() => {
        setStreamActive(false);
        if (!controller.signal.aborted) {
          setStreamRequest(null);
        }
      });

    return () => controller.abort();
  }, [
    enqueueAudioChunk,
    ensureSegment,
    markAudioEnd,
    resetStreamingAudio,
    streamRequest,
  ]);

  useEffect(() => {
    if (currentPage < 0) return;
    setIsFlipping(true);
    const timer = window.setTimeout(() => setIsFlipping(false), 550);
    return () => window.clearTimeout(timer);
  }, [currentPage]);

  const activePage = pages[currentPage];
  const isStreamingText = streamActive && !pageReady;
  const isTextBusy = isStreamingText || isAnimatingText;
  const streamStart = streamEvents.find((event) => event.type === "start") as
    | StoryStreamEvent
    | undefined;
  const streamComplete = streamEvents.find(
    (event) => event.type === "complete",
  ) as StoryStreamEvent | undefined;
  const streamedText = useMemo(
    () =>
      streamEvents
        .filter((event) => event.type === "llm_token")
        .map(
          (event) => (event as StoryStreamEvent & { type: "llm_token" }).text,
        )
        .join(""),
    [streamEvents],
  );
  const streamingPageNumber =
    (streamStart &&
      "pageNumber" in streamStart &&
      typeof streamStart.pageNumber === "number" &&
      streamStart.pageNumber) ||
    pages.length + 1;
  const isLastPage = currentPage === pages.length - 1 && !isTextBusy;
  const isStoryReady = Boolean(story);
  const isAwaitingTitle = story?.status === "awaiting_title";
  const displayPage =
    isStreamingText || isAnimatingText
      ? ({
          id: "stream",
          pageNumber: streamingPageNumber,
          text: streamedText || "Era uma vez...",
          imageUrl: null,
          audioUrl: null,
          choices: [],
        } as StoryPage)
      : activePage;
  const isPageMediaLoading = activePage
    ? mediaLoading.has(activePage.id)
    : false;
  const pageNeedsMedia = Boolean(
    activePage &&
      (!activePage.imageUrl ||
        !activePage.audioUrl ||
        activePage.choices.some((choice) => !choice.imageUrl)),
  );
  const isStreamingAudioActive = streamActive || isAnimatingText;
  const shouldUseStreamedAudio =
    isStreamingAudioActive ||
    (hasStreamingAudio &&
      Boolean(streamedAudioPageId) &&
      activePage?.id === streamedAudioPageId);

  useEffect(() => {
    if (!streamComplete || streamComplete.type !== "complete") return;
    if (!streamComplete.page) {
      setPageReady(true);
      return;
    }
    setAnimationTarget(streamComplete.page.text ?? streamedText);
    setIsAnimatingText(true);
    setPageReady(true);
    setStreamedAudioPageId(streamComplete.page.id);
    setPages((prev) => {
      if (prev.some((page) => page.id === streamComplete.page?.id)) {
        return prev;
      }
      const next = [...prev, streamComplete.page as StoryPage];
      setCurrentPage(next.length - 1);
      return next;
    });
    setStory(streamComplete.story as Story);
    setTitleOptions(streamComplete.titleOptions ?? []);
    setModels(streamComplete.models ?? null);
  }, [streamComplete, streamedText]);

  useEffect(() => {
    if (!streamStart || streamStart.type !== "start") return;
    setModels((prev) => ({ ...(prev ?? {}), ...streamStart.models }));
  }, [streamStart]);

  useEffect(() => {
    if (!isStreamingText) return;
    if (streamedText) {
      setAnimationTarget(streamedText);
      setIsAnimatingText(true);
    } else {
      setAnimationTarget("");
    }
  }, [isStreamingText, streamedText]);

  useEffect(() => {
    if (!isAnimatingText) return;
    if (!animationTarget) {
      setAnimatedText("");
      return;
    }
    if (animatedText.length >= animationTarget.length) {
      setIsAnimatingText(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setAnimatedText((prev) => {
        if (prev.length >= animationTarget.length) return prev;
        return prev + animationTarget.slice(prev.length, prev.length + 1);
      });
    }, 28);

    return () => window.clearTimeout(timeout);
  }, [animatedText, animationTarget, isAnimatingText]);

  useEffect(() => {
    if (isStreamingText || isAnimatingText) return;
    setAnimationTarget(activePage?.text ?? "");
    setAnimatedText(activePage?.text ?? "");
  }, [activePage?.text, isAnimatingText, isStreamingText]);

  useEffect(() => {
    if (!story || !activePage || !pageNeedsMedia) return;
    if (mediaLoading.has(activePage.id)) return;
    if (isStreamingText || isAnimatingText) return;
    setMediaLoading((prev) => new Set(prev).add(activePage.id));
    generateMedia.mutate(
      { storyId: story.id, pageId: activePage.id },
      {
        onSuccess: (result) => {
          if (result.page) {
            setPages((prev) =>
              prev.map((page) =>
                page.id === result.page.id ? (result.page as StoryPage) : page,
              ),
            );
          }
          if (result.story) {
            setStory(result.story as Story);
          }
          if (result.models) {
            setModels((prev) => ({ ...(prev ?? {}), ...result.models }));
          }
        },
        onSettled: () => {
          setMediaLoading((prev) => {
            const next = new Set(prev);
            next.delete(activePage.id);
            return next;
          });
        },
      },
    );
  }, [
    activePage,
    generateMedia,
    isAnimatingText,
    isStreamingText,
    mediaLoading,
    pageNeedsMedia,
    story,
  ]);

  const footerText = useMemo(() => {
    if (!story) return "Abra o livro e deixe a magia acontecer.";
    if (story.status === "completed") {
      return "Livro concluido. Pronto para uma nova aventura?";
    }
    return "Vire a pagina e escolha o caminho.";
  }, [story]);

  const renderStreamingText = () => {
    const text = animatedText || "Era uma vez...";
    if ((!isStreamingText && !isAnimatingText) || text.length === 0) {
      return text;
    }
    const lastIndex = text.length - 1;
    const prefix = text.slice(0, lastIndex);
    const activeChar = text.slice(lastIndex);
    return (
      <>
        <span>{prefix}</span>
        <span className="storybook-active-letter">{activeChar}</span>
      </>
    );
  };

  const handleCreateStory = async () => {
    const result = await startStory.mutateAsync();
    setStoryId(result.story.id);
    setStory(result.story as Story);
    setPages([]);
    setCurrentPage(0);
    setTitleOptions([]);
    setModels(null);
    setStreamError(null);
    setStreamRequest({ storyId: result.story.id, choiceId: null });
  };

  const handleChoose = async (choiceId: string) => {
    if (!story || !isLastPage || story.status === "completed") return;
    if (isTextBusy) return;
    setStreamError(null);
    setStreamRequest({ storyId: story.id, choiceId });
  };

  const handleTitleSelect = async (title: string) => {
    if (!story) return;
    const updated = await finishStory.mutateAsync({
      storyId: story.id,
      title,
    });
    setStory(updated as Story);
  };

  const handlePrev = () => {
    if (isTextBusy) return;
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (isTextBusy) return;
    if (currentPage < pages.length - 1) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  return (
    <div className="storybook-theme">
      <div className="storybook-sparkles" aria-hidden="true" />
      <div className="mx-auto max-w-6xl px-6 pb-12 pt-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="storybook-kicker">Livro magico interativo</p>
            <h1 className="storybook-title">
              {story?.title ?? "A aventura de hoje"}
            </h1>
            <p className="storybook-subtitle">
              {story?.theme
                ? `Tema: ${story.theme}`
                : "Escolha um tema infantil aleatorio e comece."}
            </p>
            {models && (
              <p className="mt-2 text-xs text-[#b06a33]">
                Modelos: {models.text ?? "-"}, {models.image ?? "-"},{" "}
                {models.audio ?? "-"}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCreateStory}
              className="storybook-button"
              disabled={startStory.isPending || isTextBusy}
            >
              {startStory.isPending
                ? "Preparando..."
                : isTextBusy
                  ? "Contando..."
                  : "Contar nova historia"}
            </button>
          </div>
        </div>

        <div className="mt-10">
          {!isStoryReady && (
            <div className="storybook-empty">
              <div className="storybook-empty-illustration" />
              <p>Toque no botao para comecar um novo conto.</p>
            </div>
          )}

          {isStoryReady && displayPage && (
            <div className="storybook-book">
              <div
                className={`storybook-page ${isFlipping ? "storybook-page-flip" : ""}`}
              >
                <div className="storybook-page-left">
                  {displayPage.imageUrl ? (
                    <Image
                      src={displayPage.imageUrl}
                      alt="Ilustracao da pagina"
                      width={720}
                      height={480}
                      className="storybook-illustration"
                      unoptimized
                    />
                  ) : (
                    <div
                      className={`storybook-illustration-placeholder ${isPageMediaLoading || isTextBusy ? "storybook-loading" : ""}`}
                    >
                      <span>
                        {isTextBusy
                          ? "Ilustracao depois do texto"
                          : "Ilustracao chegando"}
                      </span>
                    </div>
                  )}
                  <div className="storybook-audio">
                    {displayPage.audioUrl && !shouldUseStreamedAudio ? (
                      <audio controls src={displayPage.audioUrl}>
                        <track
                          kind="captions"
                          src="data:text/vtt,WEBVTT"
                          srcLang="pt"
                          label="Sem legenda"
                          default
                        />
                      </audio>
                    ) : shouldUseStreamedAudio ? (
                      <audio ref={audioRef} controls>
                        <track
                          kind="captions"
                          src="data:text/vtt,WEBVTT"
                          srcLang="pt"
                          label="Sem legenda"
                          default
                        />
                      </audio>
                    ) : (
                      <span>
                        {isTextBusy
                          ? "Narracao depois do texto"
                          : isPageMediaLoading
                            ? "Narracao carregando..."
                            : "Narracao em breve"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="storybook-page-right">
                  <p className="storybook-page-number">
                    Pagina {displayPage.pageNumber}
                  </p>
                  <p className="storybook-text">
                    {isStreamingText || isAnimatingText
                      ? renderStreamingText()
                      : displayPage.text}
                  </p>
                  <p className="storybook-footer">{footerText}</p>
                </div>
              </div>
            </div>
          )}

          {streamError && (
            <p className="mt-4 text-sm text-[#b84d3a]">{streamError}</p>
          )}

          {isStoryReady && (
            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handlePrev}
                className="storybook-nav-button"
                disabled={currentPage === 0 || isTextBusy}
              >
                Pagina anterior
              </button>
              <div className="storybook-progress">
                {pages.length === 0
                  ? "Pagina 0"
                  : `Pagina ${currentPage + 1} de ${pages.length}`}
              </div>
              <button
                type="button"
                onClick={handleNext}
                className="storybook-nav-button"
                disabled={currentPage >= pages.length - 1 || isTextBusy}
              >
                Proxima pagina
              </button>
            </div>
          )}

          {isStoryReady &&
            activePage &&
            isLastPage &&
            !isAwaitingTitle &&
            !isTextBusy && (
              <div className="mt-10 grid gap-4 md:grid-cols-2">
                {activePage.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => handleChoose(choice.id)}
                    className="storybook-choice"
                  >
                    {choice.imageUrl ? (
                      <Image
                        src={choice.imageUrl}
                        alt="Ilustracao da escolha"
                        width={320}
                        height={200}
                        className="storybook-choice-image"
                        unoptimized
                      />
                    ) : (
                      <div
                        className={`storybook-choice-image storybook-choice-fallback ${isPageMediaLoading ? "storybook-loading" : ""}`}
                      >
                        <span>Ilustracao</span>
                      </div>
                    )}
                    <span>{choice.text}</span>
                  </button>
                ))}
              </div>
            )}

          {isStoryReady && isAwaitingTitle && titleOptions.length > 0 && (
            <div className="storybook-finale">
              <div className="storybook-finale-card">
                <h2>Fim da historia!</h2>
                <p>Escolha um titulo para guardar este livro.</p>
                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {titleOptions.map((title) => (
                    <button
                      key={title}
                      type="button"
                      onClick={() => handleTitleSelect(title)}
                      className="storybook-title-option"
                    >
                      {title}
                    </button>
                  ))}
                </div>
              </div>
              <div className="storybook-finale-stars" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
