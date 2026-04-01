/**
 * BatchWriter单元测试
 */

import { BatchWriter } from '../../src/scripts/optimized-batch-writer';

describe('BatchWriter', () => {
  let flushFn: jest.Mock;
  let writer: BatchWriter<string>;

  beforeEach(() => {
    flushFn = jest.fn().mockResolvedValue(undefined);
    writer = new BatchWriter(3, flushFn);
  });

  describe('add', () => {
    it('should add items to queue without flushing if below batch size', async () => {
      await writer.add('item1');
      await writer.add('item2');

      expect(writer.getQueueSize()).toBe(2);
      expect(flushFn).not.toHaveBeenCalled();
    });

    it('should automatically flush when batch size is reached', async () => {
      await writer.add('item1');
      await writer.add('item2');
      await writer.add('item3');

      expect(flushFn).toHaveBeenCalledTimes(1);
      expect(flushFn).toHaveBeenCalledWith(['item1', 'item2', 'item3']);
      expect(writer.getQueueSize()).toBe(0);
    });
  });

  describe('addBatch', () => {
    it('should add multiple items and flush in batches', async () => {
      await writer.addBatch(['item1', 'item2', 'item3', 'item4', 'item5']);

      expect(flushFn).toHaveBeenCalledTimes(1);
      expect(flushFn).toHaveBeenCalledWith(['item1', 'item2', 'item3']);
      expect(writer.getQueueSize()).toBe(2);
    });
  });

  describe('flush', () => {
    it('should flush current queue contents', async () => {
      await writer.add('item1');
      await writer.add('item2');
      await writer.flush();

      expect(flushFn).toHaveBeenCalledWith(['item1', 'item2']);
      expect(writer.getQueueSize()).toBe(0);
    });

    it('should not flush if queue is empty', async () => {
      await writer.flush();
      expect(flushFn).not.toHaveBeenCalled();
    });

    it('should not flush concurrently', async () => {
      const slowFlushFn = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      const slowWriter = new BatchWriter(2, slowFlushFn);

      await slowWriter.add('item1');
      await slowWriter.add('item2'); // Triggers flush

      const flushPromise = slowWriter.flush(); // Should not flush again
      
      await flushPromise;
      expect(slowFlushFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('flushAll', () => {
    it('should flush all remaining items in multiple batches', async () => {
      await writer.add('item1');
      await writer.add('item2');
      await writer.add('item3');
      await writer.add('item4');
      await writer.add('item5');

      await writer.flushAll();

      expect(flushFn).toHaveBeenCalledTimes(2);
      expect(writer.getQueueSize()).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear queue without flushing', () => {
      writer.add('item1');
      writer.add('item2');
      writer.clear();

      expect(writer.getQueueSize()).toBe(0);
      expect(flushFn).not.toHaveBeenCalled();
    });
  });
});
