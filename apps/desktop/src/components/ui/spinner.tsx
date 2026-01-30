interface SpinnerProps {
	size?: number;
	className?: string;
}

export function Spinner({ size = 20, className = "" }: SpinnerProps) {
	return (
		<div
			className={`spinner ${className}`}
			style={{ width: size, height: size }}
		/>
	);
}

export function LoadingAscii({ className = "" }: { className?: string }) {
	return <span className={`loading-ascii ${className}`} />;
}
