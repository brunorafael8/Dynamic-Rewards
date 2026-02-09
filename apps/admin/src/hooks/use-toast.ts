import { toast } from "sonner";

export function useToast() {
	return {
		toast: ({
			title,
			description,
			variant = "default",
		}: {
			title?: string;
			description?: string;
			variant?: "default" | "destructive";
		}) => {
			if (variant === "destructive") {
				toast.error(title || "Error", { description });
			} else {
				toast.success(title || "Success", { description });
			}
		},
	};
}
