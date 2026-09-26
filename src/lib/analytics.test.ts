import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	durationBucket,
	failureReason,
	fileContainer,
	resolutionTier,
	sizeBucket,
	trackEvent
} from './analytics';

const MB = 1024 * 1024;

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('trackEvent', () => {
	it('forwards the event and its data to umami', () => {
		const track = vi.fn();
		vi.stubGlobal('window', { umami: { track } });
		trackEvent('file_rejected', { reason: 'too_large' });
		expect(track).toHaveBeenCalledWith('file_rejected', { reason: 'too_large' });
	});

	it('is a no-op on the server', () => {
		expect(() => trackEvent('file_rejected', { reason: 'too_large' })).not.toThrow();
	});

	it('is a no-op when the tracker is blocked or not loaded yet', () => {
		vi.stubGlobal('window', {});
		expect(() => trackEvent('file_rejected', { reason: 'unsupported_type' })).not.toThrow();
	});

	it('never lets a tracker error break the app', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.stubGlobal('window', {
			umami: {
				track: () => {
					throw new Error('network');
				}
			}
		});
		expect(() =>
			trackEvent('video_downloaded', { mode: 'compress', target: '100 MB' })
		).not.toThrow();
		expect(warn).toHaveBeenCalledTimes(1);
	});
});

describe('resolutionTier', () => {
	const cases = [
		{ resolution: '3840x2160', expected: '2160p+' },
		{ resolution: '2160x3840', expected: '2160p+' },
		{ resolution: '7680x4320', expected: '2160p+' },
		{ resolution: '2560x1440', expected: '1440p' },
		{ resolution: '1920x1080', expected: '1080p' },
		{ resolution: '1080x1920', expected: '1080p' },
		{ resolution: '1280x720', expected: '720p' },
		{ resolution: '854x480', expected: 'sd' },
		{ resolution: '0x0', expected: 'unknown' },
		{ resolution: 'garbage', expected: 'unknown' }
	];

	it.each(cases)('$resolution -> $expected', ({ resolution, expected }) => {
		expect(resolutionTier(resolution)).toBe(expected);
	});
});

describe('sizeBucket', () => {
	const cases = [
		{ bytes: 10 * MB, expected: '<25MB' },
		{ bytes: 25 * MB, expected: '25-100MB' },
		{ bytes: 180 * MB, expected: '100-500MB' },
		{ bytes: 700 * MB, expected: '500MB-1GB' },
		{ bytes: 1143 * MB, expected: '1GB+' }
	];

	it.each(cases)('$bytes -> $expected', ({ bytes, expected }) => {
		expect(sizeBucket(bytes)).toBe(expected);
	});
});

describe('durationBucket', () => {
	const cases = [
		{ seconds: 15, expected: '<30s' },
		{ seconds: 30, expected: '30s-2m' },
		{ seconds: 300, expected: '2-10m' },
		{ seconds: 3600, expected: '10m+' },
		{ seconds: Number.NaN, expected: 'unknown' },
		{ seconds: Number.POSITIVE_INFINITY, expected: 'unknown' }
	];

	it.each(cases)('$seconds -> $expected', ({ seconds, expected }) => {
		expect(durationBucket(seconds)).toBe(expected);
	});
});

describe('fileContainer', () => {
	const cases = [
		{ name: 'clip.MP4', expected: 'mp4' },
		{ name: 'my.holiday.video.mkv', expected: 'mkv' },
		{ name: 'no-extension', expected: 'unknown' }
	];

	it.each(cases)('$name -> $expected', ({ name, expected }) => {
		expect(fileContainer(name)).toBe(expected);
	});
});

describe('failureReason', () => {
	const cases = [
		{ name: 'OOM abort', error: new Error('FFmpeg exited with code -1'), expected: 'exit_-1' },
		{ name: 'ffmpeg error', error: new Error('FFmpeg exited with code 1'), expected: 'exit_1' },
		{ name: 'other error', error: new Error('mount failed'), expected: 'exception' },
		{ name: 'non-error value', error: 'boom', expected: 'exception' }
	];

	it.each(cases)('$name', ({ error, expected }) => {
		expect(failureReason(error)).toBe(expected);
	});
});
