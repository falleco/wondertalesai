import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowRule } from '../entities/workflow-rule.entity';
import {
  WorkflowTrigger,
  type WorkflowTriggerActionType,
  type WorkflowTriggerStatus,
} from '../entities/workflow-trigger.entity';

type WebhookActionConfig = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowRule)
    private readonly ruleRepository: Repository<WorkflowRule>,
    @InjectRepository(WorkflowTrigger)
    private readonly triggerRepository: Repository<WorkflowTrigger>,
  ) {}

  async listRules(userId: string) {
    const rules = await this.ruleRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      guidelines: rule.guidelines,
      outputTags: rule.outputTags ?? [],
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    }));
  }

  async createRule(input: {
    userId: string;
    name: string;
    guidelines: string;
    outputTags?: string[];
  }) {
    const name = input.name.trim();
    const guidelines = input.guidelines.trim();
    const outputTags = this.normalizeTags(input.outputTags);

    if (!name || !guidelines) {
      throw new Error('Invalid workflow rule data');
    }

    const rule = this.ruleRepository.create({
      userId: input.userId,
      name,
      guidelines,
      outputTags: outputTags.length ? outputTags : null,
    });

    const saved = await this.ruleRepository.save(rule);

    return {
      id: saved.id,
      name: saved.name,
      guidelines: saved.guidelines,
      outputTags: saved.outputTags ?? [],
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async listTriggers(userId: string) {
    const triggers = await this.triggerRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return triggers.map((trigger) => ({
      id: trigger.id,
      name: trigger.name,
      conditions: trigger.conditions,
      status: trigger.status,
      action: {
        type: trigger.actionType,
        config: trigger.actionConfig ?? {},
      },
      createdAt: trigger.createdAt,
      updatedAt: trigger.updatedAt,
    }));
  }

  async createTrigger(input: {
    userId: string;
    name: string;
    conditions: string;
    action: {
      type: WorkflowTriggerActionType;
      config: WebhookActionConfig;
    };
  }) {
    const name = input.name.trim();
    const conditions = input.conditions.trim();
    const actionConfig = this.normalizeWebhook(input.action.config);

    if (!name || !conditions || !actionConfig.url) {
      throw new Error('Invalid workflow trigger data');
    }

    const trigger = this.triggerRepository.create({
      userId: input.userId,
      name,
      conditions,
      actionType: input.action.type,
      actionConfig,
      status: 'active',
    });

    const saved = await this.triggerRepository.save(trigger);

    return {
      id: saved.id,
      name: saved.name,
      conditions: saved.conditions,
      status: saved.status,
      action: {
        type: saved.actionType,
        config: saved.actionConfig ?? {},
      },
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async updateTrigger(input: {
    userId: string;
    triggerId: string;
    name?: string;
    conditions?: string;
    action?: {
      type: WorkflowTriggerActionType;
      config: WebhookActionConfig;
    };
  }) {
    const trigger = await this.triggerRepository.findOne({
      where: { id: input.triggerId, userId: input.userId },
    });

    if (!trigger) {
      return { updated: false };
    }

    if (input.name) {
      trigger.name = input.name.trim();
    }
    if (input.conditions) {
      trigger.conditions = input.conditions.trim();
    }
    if (input.action) {
      trigger.actionType = input.action.type;
      trigger.actionConfig = this.normalizeWebhook(input.action.config);
    }

    const saved = await this.triggerRepository.save(trigger);

    return {
      updated: true,
      trigger: {
        id: saved.id,
        name: saved.name,
        conditions: saved.conditions,
        status: saved.status,
        action: {
          type: saved.actionType,
          config: saved.actionConfig ?? {},
        },
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      },
    };
  }

  async setTriggerStatus(input: {
    userId: string;
    triggerId: string;
    status: WorkflowTriggerStatus;
  }) {
    const trigger = await this.triggerRepository.findOne({
      where: { id: input.triggerId, userId: input.userId },
    });

    if (!trigger) {
      return { updated: false };
    }

    trigger.status = input.status;
    await this.triggerRepository.save(trigger);
    return { updated: true };
  }

  private normalizeTags(tags?: string[]) {
    if (!tags) {
      return [];
    }
    return tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
  }

  private normalizeWebhook(config: WebhookActionConfig) {
    const method = config.method?.trim().toUpperCase() || 'POST';
    return {
      url: config.url.trim(),
      method,
      headers: config.headers ?? {},
      body: config.body ?? '',
    };
  }
}
