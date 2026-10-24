import { useRef, useState } from 'react';
import type { DragEvent, KeyboardEvent } from 'react';

export function formatSize(bytes: number): string {
	if (!bytes || bytes <= 0) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB'];
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit++;
	}
	return `${value >= 100 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

interface DropzoneProps {
	file: File | null;
	onChange: (file: File | null) => void;
}

export default function Dropzone({ file, onChange }: DropzoneProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);

	const pick = () => inputRef.current?.click();

	const onDrop = (event: DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setDragging(false);
		const dropped = event.dataTransfer.files?.[0];
		if (dropped) onChange(dropped);
	};

	const onkeydown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			pick();
		}
	};

	return (
		<>
			<div
				className={`dropzone${dragging ? ' dragging' : ''}`}
				tabIndex={0}
				role="button"
				aria-label="选择或拖拽文件"
				onClick={pick}
				onKeyDown={onkeydown}
				onDragEnter={(e) => {
					e.preventDefault();
					setDragging(true);
				}}
				onDragOver={(e) => {
					e.preventDefault();
					setDragging(true);
				}}
				onDragLeave={(e) => {
					e.preventDefault();
					setDragging(false);
				}}
				onDrop={onDrop}
			>
				<span className="dropzone-icon">📤</span>
				<span className="dropzone-text">点击选择，或把文件拖到这里</span>
				<span className="dropzone-hint">最大 100MB · 非管理员上传 24 小时后自动销毁</span>
			</div>
			<input
				ref={inputRef}
				type="file"
				hidden
				onChange={(e) => onChange(e.target.files?.[0] ?? null)}
			/>
			{file && (
				<div className="file-chip">
					<span>{`${file.name} · ${formatSize(file.size)}`}</span>
					<button type="button" aria-label="移除文件" onClick={() => onChange(null)}>
						✕
					</button>
				</div>
			)}
		</>
	);
}
