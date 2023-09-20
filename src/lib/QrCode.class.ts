import QrCodeGenerator from 'qrcode-generator';

type EyeColor = string | InnerOuterEyeColor;
type InnerOuterEyeColor = {
	inner: string;
	outer: string;
};

type CornerRadii = number | [number, number, number, number] | InnerOuterRadii;
type InnerOuterRadii = {
	inner: number | [number, number, number, number];
	outer: number | [number, number, number, number];
};
export interface QrCodeProps {
	/**
	 * The value encoded in the QR Code.
	 * When the QR Code is decoded, this value will be returned.
	 */
	value?: string;
	/**
	 * The error correction level of the QR Code.
	 */
	ecLevel?: 'L' | 'M' | 'Q' | 'H';
	enableCORS?: boolean;
	/**
	 * The size of the QR Code.
	 */
	size?: number;
	bgColor?: string;
	fgColor?: string;
	/**
	 * The size of the quiet zone around the QR Code.
	 * This will have the same color as QR Code bgColor.
	 */
	quietZone?: number;
	/**
	 * The logo image. It can be a url/path or a base64 value.
	 */
	logoImage?: string;
	logoWidth?: number;
	logoHeight?: number;
	logoOpacity?: number;
	/**
	 * Callback function to know when the logo in the QR Code is loaded.
	 */
	logoOnLoad?: () => void;
	/**
	 * Removes points behind the logo. If no logoPadding is
	 * specified, the removed part will have the same size as the logo.
	 */
	removeQrCodeBehindLogo?: boolean;
	/**
	 * Adds a border with no points around the logo. When > 0,
	 * the padding will be visible even if the prop removeQrCodeBehindLogo
	 * is not set to true.
	 */
	logoPadding?: number;
	/**
	 * Sets the shape of the padding area around the logo.
	 */
	logoPaddingStyle?: 'square' | 'circle';
	/**
	 * The corner radius for the positional patterns (the three "eyes"
	 * around the QR code).
	 *  https://github.com/gcoro/react-qrcode-logo/blob/master/res/eyeRadius_doc.md
	 */
	eyeRadius?: CornerRadii | [CornerRadii, CornerRadii, CornerRadii];
	/**
	 * The color for the positional patterns (the three "eyes" around the QR code).
	 * https://github.com/gcoro/react-qrcode-logo/blob/master/res/eyeColor_doc.md
	 */
	eyeColor?: EyeColor | [EyeColor, EyeColor, EyeColor];
	/**
	 * Style of the QR Code modules.
	 */
	qrStyle?: 'squares' | 'dots';
	style?: object;
	id?: string;
}

interface ICoordinates {
	row: number;
	col: number;
}

// Constants
const qrCodeSize = 150;

const defaultProps = {
	value: 'https://kit.svelte.dev/',
	ecLevel: 'M',
	enableCORS: false,
	size: qrCodeSize,
	quietZone: 10,
	bgColor: '#FFFFFF',
	fgColor: '#000000',
	logoOpacity: 1,
	qrStyle: 'squares',
	eyeRadius: [0, 0, 0],
	logoPaddingStyle: 'square'
} as const;

export class QrCode implements QrCodeProps {
	bgColor?: string;
	ecLevel?: 'L' | 'M' | 'Q' | 'H';
	enableCORS?: boolean;
	eyeColor?: EyeColor | [EyeColor, EyeColor, EyeColor];
	eyeRadius?: CornerRadii | [CornerRadii, CornerRadii, CornerRadii];
	fgColor?: string;
	id?: string;
	logoHeight?: number;
	logoImage?: string;
	logoOnLoad?: () => void;
	logoOpacity?: number;
	logoPadding?: number;
	logoPaddingStyle?: 'square' | 'circle';
	logoWidth?: number;
	qrStyle?: 'squares' | 'dots';
	quietZone?: number;
	removeQrCodeBehindLogo?: boolean;
	size?: number;
	style?: object;
	value?: string;

	private internalCanvas: HTMLCanvasElement = document.createElement('canvas');
	private ctx = this.internalCanvas.getContext('2d');

	get canvas() {
		return this.internalCanvas;
	}

	get dataUrl(): string {
		return this.internalCanvas.toDataURL();
	}

	constructor(data: QrCodeProps) {
		const dataDefaulted = {
			...data,
			value: data.value ?? defaultProps.value,
			ecLevel: data.ecLevel ?? defaultProps.ecLevel,
			enableCORS: data.enableCORS ?? defaultProps.enableCORS,
			size: data.size ?? defaultProps.size,
			quietZone: data.quietZone ?? defaultProps.quietZone,
			bgColor: data.bgColor ?? defaultProps.bgColor,
			fgColor: data.fgColor ?? defaultProps.fgColor,
			logoOpacity: data.logoOpacity ?? defaultProps.logoOpacity,
			qrStyle: data.qrStyle ?? defaultProps.qrStyle,
			eyeRadius: data.eyeRadius ?? defaultProps.eyeRadius,
			logoPaddingStyle: data.logoPaddingStyle ?? defaultProps.logoPaddingStyle
		}; // satisfies IProps;

		const {
			bgColor,
			ecLevel,
			enableCORS,
			eyeColor,
			eyeRadius,
			fgColor,
			logoHeight = 0,
			logoImage,
			logoOnLoad,
			logoOpacity,
			logoPadding = 0,
			logoPaddingStyle,
			logoWidth = 0,
			qrStyle,
			quietZone,
			removeQrCodeBehindLogo,
			// TODO: auto adjust size maybe based on size of string?
			size,
			value
		} = dataDefaulted;

		if (this.ctx === null) throw new Error('Unable to make QR code');

		const qrCode = QrCodeGenerator(0, ecLevel);
		qrCode.addData(this.utf16to8(value));
		qrCode.make();

		const canvasSize = size + 2 * quietZone;
		const length = qrCode.getModuleCount();
		const cellSize = size / length;
		const scale = window.devicePixelRatio || 1;
		this.internalCanvas.height = this.internalCanvas.width = canvasSize * scale;
		this.ctx.scale(scale, scale);

		this.ctx.fillStyle = bgColor;
		this.ctx.fillRect(0, 0, canvasSize, canvasSize);

		const offset = quietZone;

		const positioningZones: ICoordinates[] = [
			{ row: 0, col: 0 },
			{ row: 0, col: length - 7 },
			{ row: length - 7, col: 0 }
		];

		this.ctx.strokeStyle = fgColor;
		if (qrStyle === 'dots') {
			this.ctx.fillStyle = fgColor;
			const radius = cellSize / 2;
			for (let row = 0; row < length; row++) {
				for (let col = 0; col < length; col++) {
					if (qrCode.isDark(row, col) && !this.isInPositioninZone(row, col, positioningZones)) {
						this.ctx.beginPath();
						this.ctx.arc(
							Math.round(col * cellSize) + radius + offset,
							Math.round(row * cellSize) + radius + offset,
							(radius / 100) * 75,
							0,
							2 * Math.PI,
							false
						);
						this.ctx.closePath();
						this.ctx.fill();
					}
				}
			}
		} else {
			for (let row = 0; row < length; row++) {
				for (let col = 0; col < length; col++) {
					if (qrCode.isDark(row, col) && !this.isInPositioninZone(row, col, positioningZones)) {
						this.ctx.fillStyle = fgColor;
						const w = Math.ceil((col + 1) * cellSize) - Math.floor(col * cellSize);
						const h = Math.ceil((row + 1) * cellSize) - Math.floor(row * cellSize);
						this.ctx.fillRect(
							Math.round(col * cellSize) + offset,
							Math.round(row * cellSize) + offset,
							w,
							h
						);
					}
				}
			}
		}

		// Draw positioning patterns
		for (let i = 0; i < 3; i++) {
			const { row, col } = positioningZones[i];

			let radii = eyeRadius;
			// if not specified, eye color is the same as foreground,
			let color: EyeColor = fgColor;

			if (Array.isArray(radii)) {
				radii = radii[i];
			}
			if (typeof radii == 'number') {
				radii = [radii, radii, radii, radii];
			}

			if (typeof eyeColor !== 'undefined') {
				if (Array.isArray(eyeColor)) {
					// if array, we pass the single color
					color = eyeColor[i];
				} else {
					color = eyeColor as EyeColor;
				}
			}

			// TODO: No as...
			this.drawPositioningPattern(cellSize, offset, row, col, color, radii as CornerRadii);
		}

		if (logoImage) {
			const image = new Image();
			if (enableCORS) {
				image.crossOrigin = 'Anonymous';
			}

			image.onload = () => {
				if (this.ctx === null) throw new Error('Unable to make QR code');

				this.ctx.save();

				const dWidthLogo = logoWidth || size * 0.2;
				const dHeightLogo = logoHeight || dWidthLogo;
				const dxLogo = (size - dWidthLogo) / 2;
				const dyLogo = (size - dHeightLogo) / 2;

				if (removeQrCodeBehindLogo || logoPadding) {
					this.ctx.beginPath();

					this.ctx.strokeStyle = bgColor;
					this.ctx.fillStyle = bgColor;

					const dWidthLogoPadding = dWidthLogo + 2 * logoPadding;
					const dHeightLogoPadding = dHeightLogo + 2 * logoPadding;
					const dxLogoPadding = dxLogo + offset - logoPadding;
					const dyLogoPadding = dyLogo + offset - logoPadding;

					if (logoPaddingStyle === 'circle') {
						const dxCenterLogoPadding = dxLogoPadding + dWidthLogoPadding / 2;
						const dyCenterLogoPadding = dyLogoPadding + dHeightLogoPadding / 2;
						this.ctx.ellipse(
							dxCenterLogoPadding,
							dyCenterLogoPadding,
							dWidthLogoPadding / 2,
							dHeightLogoPadding / 2,
							0,
							0,
							2 * Math.PI
						);
						this.ctx.stroke();
						this.ctx.fill();
					} else {
						this.ctx.fillRect(dxLogoPadding, dyLogoPadding, dWidthLogoPadding, dHeightLogoPadding);
					}
				}

				this.ctx.globalAlpha = logoOpacity;
				this.ctx.drawImage(image, dxLogo + offset, dyLogo + offset, dWidthLogo, dHeightLogo);
				// TODO: Why was it "restore" not "save"?
				// this.ctx.restore();
				this.ctx.save();
				if (logoOnLoad) {
					logoOnLoad();
				}
			};

			image.onerror = (err) => {
				console.error(err);
				// TODO: Show error invalid image
			};

			image.src = logoImage;
		}

		// const dataUrl = this.canvas.toDataURL();
		// console.log('dataUrl', dataUrl);

		// this.canvas.remove();
	}

	private utf16to8(str: string): string {
		let out = '';
		let i: number;
		let c: number;
		const len: number = str.length;
		for (i = 0; i < len; i++) {
			c = str.charCodeAt(i);
			if (c >= 0x0001 && c <= 0x007f) {
				out += str.charAt(i);
			} else if (c > 0x07ff) {
				out += String.fromCharCode(0xe0 | ((c >> 12) & 0x0f));
				out += String.fromCharCode(0x80 | ((c >> 6) & 0x3f));
				out += String.fromCharCode(0x80 | ((c >> 0) & 0x3f));
			} else {
				out += String.fromCharCode(0xc0 | ((c >> 6) & 0x1f));
				out += String.fromCharCode(0x80 | ((c >> 0) & 0x3f));
			}
		}
		return out;
	}

	/**
	 * Draw a rounded square in the canvas
	 */
	private drawRoundedSquare(
		lineWidth: number,
		x: number,
		y: number,
		size: number,
		color: string,
		radii: number | number[],
		fill: boolean
	) {
		if (this.ctx === null) throw new Error('Unable to make QR code');

		this.ctx.lineWidth = lineWidth;
		this.ctx.fillStyle = color;
		this.ctx.strokeStyle = color;

		// Adjust coordinates so that the outside of the stroke is aligned to the edges
		y += lineWidth / 2;
		x += lineWidth / 2;
		size -= lineWidth;

		if (!Array.isArray(radii)) {
			radii = [radii, radii, radii, radii];
		}

		// Radius should not be greater than half the size or less than zero
		radii = radii.map((r) => {
			r = Math.min(r, size / 2);
			return r < 0 ? 0 : r;
		});

		const rTopLeft = radii[0] || 0;
		const rTopRight = radii[1] || 0;
		const rBottomRight = radii[2] || 0;
		const rBottomLeft = radii[3] || 0;

		this.ctx.beginPath();

		this.ctx.moveTo(x + rTopLeft, y);

		this.ctx.lineTo(x + size - rTopRight, y);
		if (rTopRight) this.ctx.quadraticCurveTo(x + size, y, x + size, y + rTopRight);

		this.ctx.lineTo(x + size, y + size - rBottomRight);
		if (rBottomRight)
			this.ctx.quadraticCurveTo(x + size, y + size, x + size - rBottomRight, y + size);

		this.ctx.lineTo(x + rBottomLeft, y + size);
		if (rBottomLeft) this.ctx.quadraticCurveTo(x, y + size, x, y + size - rBottomLeft);

		this.ctx.lineTo(x, y + rTopLeft);
		if (rTopLeft) this.ctx.quadraticCurveTo(x, y, x + rTopLeft, y);

		this.ctx.closePath();

		this.ctx.stroke();
		if (fill) {
			this.ctx.fill();
		}
	}

	/**
	 * Draw a single positional pattern eye.
	 */
	private drawPositioningPattern(
		cellSize: number,
		offset: number,
		row: number,
		col: number,
		color: EyeColor,
		radii: CornerRadii = [0, 0, 0, 0]
	) {
		const lineWidth = Math.ceil(cellSize);

		let radiiOuter: number | number[];
		let radiiInner: number | number[];
		if (typeof radii !== 'number' && !Array.isArray(radii)) {
			radiiOuter = radii.outer || 0;
			radiiInner = radii.inner || 0;
		} else {
			radiiOuter = radii; // as CornerRadii;
			radiiInner = radiiOuter;
		}

		let colorOuter;
		let colorInner;
		if (typeof color !== 'string') {
			colorOuter = color.outer;
			colorInner = color.inner;
		} else {
			colorOuter = color;
			colorInner = color;
		}

		let y = row * cellSize + offset;
		let x = col * cellSize + offset;
		let size = cellSize * 7;

		// Outer box
		this.drawRoundedSquare(lineWidth, x, y, size, colorOuter, radiiOuter, false);

		// Inner box
		size = cellSize * 3;
		y += cellSize * 2;
		x += cellSize * 2;
		this.drawRoundedSquare(lineWidth, x, y, size, colorInner, radiiInner, true);
	}
	/**
	 * Is this dot inside a positional pattern zone.
	 */
	private isInPositioninZone(col: number, row: number, zones: ICoordinates[]) {
		return zones.some(
			(zone) => row >= zone.row && row <= zone.row + 7 && col >= zone.col && col <= zone.col + 7
		);
	}

	private transformPixelLengthIntoNumberOfCells(pixelLength: number, cellSize: number) {
		return pixelLength / cellSize;
	}

	private isCoordinateInImage(
		col: number,
		row: number,
		dWidthLogo: number,
		dHeightLogo: number,
		dxLogo: number,
		dyLogo: number,
		cellSize: number,
		logoImage: string
	) {
		if (logoImage) {
			const numberOfCellsMargin = 2;
			const firstRowOfLogo = this.transformPixelLengthIntoNumberOfCells(dxLogo, cellSize);
			const firstColumnOfLogo = this.transformPixelLengthIntoNumberOfCells(dyLogo, cellSize);
			const logoWidthInCells = this.transformPixelLengthIntoNumberOfCells(dWidthLogo, cellSize) - 1;
			const logoHeightInCells =
				this.transformPixelLengthIntoNumberOfCells(dHeightLogo, cellSize) - 1;

			return (
				row >= firstRowOfLogo - numberOfCellsMargin &&
				row <= firstRowOfLogo + logoWidthInCells + numberOfCellsMargin && // check rows
				col >= firstColumnOfLogo - numberOfCellsMargin &&
				col <= firstColumnOfLogo + logoHeightInCells + numberOfCellsMargin
			); // check cols
		} else {
			return false;
		}
	}
}