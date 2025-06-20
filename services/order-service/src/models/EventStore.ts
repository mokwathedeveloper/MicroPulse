import mongoose, { Schema, Document } from 'mongoose';
import { BaseEvent } from '../../../../shared/types';
import { baseSchemaOptions } from '../../../../shared/utils/src/database';

export interface EventStoreDocument extends Document {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  eventData: any;
  metadata: {
    userId?: string;
    correlationId?: string;
    causationId?: string;
    timestamp: Date;
  };
  createdAt: Date;
}

const eventStoreSchema = new Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    index: true
  },
  aggregateId: {
    type: String,
    required: true,
    index: true
  },
  aggregateType: {
    type: String,
    required: true,
    index: true
  },
  version: {
    type: Number,
    required: true,
    min: 1
  },
  eventData: {
    type: Schema.Types.Mixed,
    required: true
  },
  metadata: {
    userId: String,
    correlationId: String,
    causationId: String,
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    }
  }
}, {
  ...baseSchemaOptions,
  collection: 'eventstore'
});

// Compound indexes for efficient querying
eventStoreSchema.index({ aggregateId: 1, version: 1 }, { unique: true });
eventStoreSchema.index({ aggregateType: 1, createdAt: -1 });
eventStoreSchema.index({ eventType: 1, createdAt: -1 });
eventStoreSchema.index({ 'metadata.userId': 1, createdAt: -1 });

// Static method to get events for an aggregate
eventStoreSchema.statics.getEventsForAggregate = function(aggregateId: string, fromVersion?: number) {
  const query: any = { aggregateId };
  
  if (fromVersion) {
    query.version = { $gte: fromVersion };
  }
  
  return this.find(query).sort({ version: 1 });
};

// Static method to get events by type
eventStoreSchema.statics.getEventsByType = function(eventType: string, limit?: number) {
  const query = this.find({ eventType }).sort({ createdAt: -1 });
  
  if (limit) {
    query.limit(limit);
  }
  
  return query;
};

// Static method to append event
eventStoreSchema.statics.appendEvent = async function(event: BaseEvent, metadata: any = {}) {
  const eventDoc = new this({
    eventId: event.id,
    eventType: event.type,
    aggregateId: event.aggregateId,
    aggregateType: event.aggregateType,
    version: event.version,
    eventData: event.data,
    metadata: {
      ...metadata,
      timestamp: event.timestamp
    }
  });
  
  return eventDoc.save();
};

export const EventStore = mongoose.model<EventStoreDocument>('EventStore', eventStoreSchema);
export default EventStore;
