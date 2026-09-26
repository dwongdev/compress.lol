export const MAX_ENCODE_EDGE = 1920;

export interface VideoMetadata {
	duration: number;
	bitrate: number;
	resolution: string;
	codec: string;
	size: number;
	fps: number;
	hasMotion: boolean;
}

export interface CompressionSettings {
	videoBitrate: string;
	audioBitrate: string;
	resolution: string;
	crf: number;
	preset: string;
	tune: string;
	bufferSize: string;
	refs: number;
	bframes: number;
	targetFps: number;
}

export const calculateOptimalResolution = (
	originalWidth: number,
	originalHeight: number,
	maxWidth: number
): string => {
	if (originalWidth <= maxWidth) {
		return `${originalWidth}x${originalHeight}`;
	}

	const aspectRatio = originalWidth / originalHeight;
	const newWidth = maxWidth;
	const newHeight = Math.round(newWidth / aspectRatio);

	const evenWidth = newWidth % 2 === 0 ? newWidth : newWidth - 1;
	const evenHeight = newHeight % 2 === 0 ? newHeight : newHeight - 1;

	return `${evenWidth}x${evenHeight}`;
};

export const fitWithinLongestEdge = (resolution: string, maxEdge: number): string => {
	const [width, height] = resolution.split('x').map(Number);
	const scale = maxEdge / Math.max(width, height);
	if (scale >= 1) {
		return resolution;
	}
	const toEven = (value: number): number => {
		const scaled = Math.round(value * scale);
		return scaled - (scaled % 2);
	};
	return `${toEven(width)}x${toEven(height)}`;
};

export const calculateCompressionSettings = (
	targetSize: number,
	metadata: VideoMetadata,
	preserveOriginalFps: boolean
): CompressionSettings => {
	const efficiency = metadata.hasMotion ? 0.8 : 0.85;
	const targetBitrate = Math.round(((targetSize * 8) / metadata.duration / 1000) * efficiency);
	const audioBitrate = Math.min(128, Math.round(targetBitrate * 0.12));
	const videoBitrate = Math.max(200, targetBitrate - audioBitrate);

	let resolution = metadata.resolution;
	let crf = 23;
	const preset = 'veryfast';
	const tune = 'film';
	const refs = 1;
	const bframes = 0;
	let targetFps = metadata.fps;
	let fpsCap = metadata.fps;

	const [width, height] = metadata.resolution.split('x').map(Number);

	if (targetSize <= 8 * 1024 * 1024) {
		const maxWidth = metadata.hasMotion ? 1024 : 854;
		if (width > maxWidth) {
			resolution = calculateOptimalResolution(width, height, maxWidth);
		}
		crf = metadata.hasMotion ? 18 : 26;
		fpsCap = 24;
	} else if (targetSize <= 25 * 1024 * 1024) {
		const maxWidth = metadata.hasMotion ? 1440 : 1280;
		if (width > maxWidth) {
			resolution = calculateOptimalResolution(width, height, maxWidth);
		}
		crf = metadata.hasMotion ? 16 : 24;
		fpsCap = 30;
	} else if (targetSize <= 50 * 1024 * 1024) {
		crf = metadata.hasMotion ? 14 : 22;
		fpsCap = 30;
	} else {
		crf = metadata.hasMotion ? 12 : 20;
		fpsCap = 30;
	}

	resolution = fitWithinLongestEdge(resolution, MAX_ENCODE_EDGE);

	if (!preserveOriginalFps) {
		targetFps = Math.min(targetFps, fpsCap);
	}

	const bufferSize = metadata.hasMotion ? `${videoBitrate * 3}k` : `${videoBitrate * 2}k`;

	return {
		videoBitrate: `${videoBitrate}k`,
		audioBitrate: `${audioBitrate}k`,
		resolution,
		crf,
		preset,
		tune,
		bufferSize,
		refs,
		bframes,
		targetFps
	};
};
