import { describe, expect, it } from 'vitest';
import { buildRatingRecord } from '../../../src/app/rating-record.js';
import { CONTENT_VERSION } from '../../../src/lib/config.js';

const SERVER_TIME = { '.sv': 'timestamp' };

const answer = {
    rating: 5,
    prediction: 4,
    responseTime: 61234,
    timestamp: SERVER_TIME,
    uid: 'uid-1',
    target: 4.04,
    score: 100,
    trial: 3,
    locale: 'en',
    room: 'DEMO-1',
};

describe('buildRatingRecord', () => {
    it('includes every v2 field', () => {
        expect(buildRatingRecord(answer)).toEqual({
            rating: 5,
            prediction: 4,
            responseTime: 61234,
            timestamp: SERVER_TIME,
            uid: 'uid-1',
            contentVersion: CONTENT_VERSION,
            feedbackShown: true,
            target: 4.04,
            score: 100,
            trial: 3,
            locale: 'en',
            room: 'DEMO-1',
        });
    });

    it('omits an unknown response time and a missing room', () => {
        const record = buildRatingRecord({ ...answer, responseTime: null, room: null });
        expect(record).not.toHaveProperty('responseTime');
        expect(record).not.toHaveProperty('room');
        expect(buildRatingRecord({ ...answer, responseTime: -5 })).not.toHaveProperty(
            'responseTime'
        );
    });

    it('keeps the trial within the range the rules accept', () => {
        expect(buildRatingRecord({ ...answer, trial: 0 }).trial).toBe(1);
        expect(buildRatingRecord({ ...answer, trial: 60 }).trial).toBe(48);
    });
});
