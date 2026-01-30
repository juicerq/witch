import type { ImgHTMLAttributes } from "react";

type AvatarSize = "sm" | "default" | "lg";

interface AvatarProps extends ImgHTMLAttributes<HTMLImageElement> {
	size?: AvatarSize;
}

const sizeClasses: Record<AvatarSize, string> = {
	sm: "avatar avatar-sm",
	default: "avatar",
	lg: "avatar avatar-lg",
};

export function Avatar({
	size = "default",
	className = "",
	alt = "",
	...props
}: AvatarProps) {
	return (
		<div className={`${sizeClasses[size]} ${className}`}>
			<img alt={alt} {...props} />
		</div>
	);
}
