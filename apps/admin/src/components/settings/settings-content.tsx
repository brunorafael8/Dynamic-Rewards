"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
	Phone,
	Zap,
	DollarSign,
	Gem,
	Clock,
	TrendingUp,
	Trash2,
	Server,
	Database,
	Activity,
} from "lucide-react";

interface LLMAnalyticsSummary {
	summary: {
		totalCalls: number;
		cachedCalls: number;
		cacheHitRate: string;
		totalCost: string;
		costSavings: string;
		savingsMultiplier: string;
		avgLatency: string;
	};
	complexity: {
		simple: string;
		complex: string;
		ultraComplex: string;
	};
	models: Record<string, number>;
	operators: Record<string, number>;
	cache: {
		entries: number;
		totalHits: number;
		avgHitsPerEntry: string;
	};
}

const StatCard = ({
	title,
	value,
	icon: Icon,
	color = "text-primary",
	bgColor = "bg-primary/10",
}: {
	title: string;
	value: string;
	icon: React.ElementType;
	color?: string;
	bgColor?: string;
}) => (
	<Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50">
		<CardHeader className="pb-3">
			<div className={`inline-flex rounded-xl ${bgColor} p-3 w-fit mb-2`}>
				<Icon className={`h-6 w-6 ${color}`} />
			</div>
			<p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">
				{title}
			</p>
		</CardHeader>
		<CardContent>
			<p className={`text-3xl font-heading font-bold ${color}`}>{value}</p>
		</CardContent>
	</Card>
);

export function SettingsContent() {
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [showClearDialog, setShowClearDialog] = useState(false);

	const { data, isLoading } = useQuery<LLMAnalyticsSummary>({
		queryKey: queryKeys.llm.analytics,
		queryFn: async () => {
			const { data } = await api.get("/analytics/llm/summary");
			return data;
		},
		refetchInterval: 30000, // Refetch every 30s for live updates
	});

	const clearMutation = useMutation({
		mutationFn: async () => {
			await api.delete("/analytics/llm");
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.llm.analytics });
			toast({
				title: "Success",
				description: "Analytics and cache cleared successfully",
			});
			setShowClearDialog(false);
		},
		onError: (error: Error) => {
			toast({
				variant: "destructive",
				title: "Error",
				description: `Failed to clear: ${error.message}`,
			});
		},
	});

	const summary = data?.summary;
	const complexity = data?.complexity;
	const models = data?.models;
	const operators = data?.operators;
	const cache = data?.cache;

	const hasData = summary && summary.totalCalls > 0;

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="flex flex-col items-center gap-3">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
					<p className="text-sm text-muted-foreground">
						Loading analytics...
					</p>
				</div>
			</div>
		);
	}

	if (!hasData) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-heading font-bold text-foreground">
						LLM Analytics
					</h1>
					<p className="text-muted-foreground mt-2">
						Monitor AI usage, costs, and performance
					</p>
				</div>

				<Card className="border-dashed">
					<CardContent className="flex flex-col items-center justify-center py-16">
						<div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
							<Activity className="h-8 w-8 text-muted-foreground" />
						</div>
						<h3 className="text-xl font-heading font-semibold mb-2">
							No analytics yet
						</h3>
						<p className="text-muted-foreground text-center max-w-md">
							Process some events with LLM-powered rules to see analytics data
							appear here
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	const getModelDisplayName = (model: string) => {
		if (model.includes("haiku")) return "Haiku";
		if (model.includes("sonnet")) return "Sonnet";
		if (model.includes("opus")) return "Opus";
		if (model.includes("gpt-4o-mini")) return "GPT-4o Mini";
		if (model.includes("gpt-4o")) return "GPT-4o";
		if (model.includes("o1")) return "o1-preview";
		return model;
	};

	const getModelColor = (model: string) => {
		if (model.includes("haiku") || model.includes("mini"))
			return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
		if (model.includes("sonnet") || model.includes("gpt-4o"))
			return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
		if (model.includes("opus") || model.includes("o1"))
			return "bg-red-500/10 text-red-700 dark:text-red-400";
		return "bg-primary/10 text-primary";
	};

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-3xl font-heading font-bold text-foreground">
						LLM Analytics
					</h1>
					<p className="text-muted-foreground mt-2">
						Monitor AI usage, costs, and performance with real-time metrics
					</p>
				</div>
				<Button
					variant="destructive"
					onClick={() => setShowClearDialog(true)}
					disabled={clearMutation.isPending}
					className="gap-2"
				>
					<Trash2 className="h-4 w-4" />
					Clear Data
				</Button>
			</div>

			{/* Overview Stats */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
				<StatCard
					title="Total Calls"
					value={summary.totalCalls.toString()}
					icon={Phone}
					color="text-primary"
					bgColor="bg-primary/10"
				/>
				<StatCard
					title="Cache Hit Rate"
					value={summary.cacheHitRate}
					icon={Zap}
					color="text-emerald-600 dark:text-emerald-400"
					bgColor="bg-emerald-500/10"
				/>
				<StatCard
					title="Total Cost"
					value={summary.totalCost}
					icon={DollarSign}
					color="text-primary"
					bgColor="bg-primary/10"
				/>
				<StatCard
					title="Cost Savings"
					value={summary.costSavings}
					icon={Gem}
					color="text-emerald-600 dark:text-emerald-400"
					bgColor="bg-emerald-500/10"
				/>
				<StatCard
					title="Avg Latency"
					value={summary.avgLatency}
					icon={Clock}
					color="text-muted-foreground"
					bgColor="bg-muted"
				/>
				<StatCard
					title="Savings"
					value={summary.savingsMultiplier}
					icon={TrendingUp}
					color="text-[#6C5CE7]"
					bgColor="bg-[#6C5CE7]/10"
				/>
			</div>

			{/* Detailed Cards */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Complexity Distribution */}
				{complexity && (
				<Card>
					<CardHeader>
						<CardTitle className="font-heading flex items-center gap-2">
							<Server className="h-5 w-5 text-primary" />
							Complexity Distribution
						</CardTitle>
						<p className="text-sm text-muted-foreground mt-1">
							How requests are routed to models
						</p>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
							<span className="font-medium">Simple</span>
							<Badge className="bg-emerald-500 text-white hover:bg-emerald-600">
								{complexity.simple}
							</Badge>
						</div>
						<div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
							<span className="font-medium">Complex</span>
							<Badge className="bg-amber-500 text-white hover:bg-amber-600">
								{complexity.complex}
							</Badge>
						</div>
						<div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20">
							<span className="font-medium">Ultra-Complex</span>
							<Badge className="bg-red-500 text-white hover:bg-red-600">
								{complexity.ultraComplex}
							</Badge>
						</div>
					</CardContent>
				</Card>
				)}

				{/* Cache Performance */}
				{cache && (
				<Card>
					<CardHeader>
						<CardTitle className="font-heading flex items-center gap-2">
							<Database className="h-5 w-5 text-primary" />
							Cache Performance
						</CardTitle>
						<p className="text-sm text-muted-foreground mt-1">
							Semantic caching efficiency
						</p>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
							<span className="text-sm font-medium">Entries</span>
							<span className="text-2xl font-heading font-bold text-primary">
								{cache.entries}
							</span>
						</div>
						<div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
							<span className="text-sm font-medium">Total Hits</span>
							<span className="text-2xl font-heading font-bold text-emerald-600 dark:text-emerald-400">
								{cache.totalHits}
							</span>
						</div>
						<div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
							<span className="text-sm font-medium">Avg Hits/Entry</span>
							<span className="text-2xl font-heading font-bold text-muted-foreground">
								{cache.avgHitsPerEntry}
							</span>
						</div>
					</CardContent>
				</Card>
				)}

				{/* Model Usage */}
				{models && Object.keys(models).length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="font-heading">Model Usage</CardTitle>
						<p className="text-sm text-muted-foreground mt-1">
							Distribution across AI models
						</p>
					</CardHeader>
					<CardContent className="space-y-3">
						{Object.entries(models).map(([model, count]) => {
							const percentage = (
								(count / summary.totalCalls) *
								100
							).toFixed(0);
							return (
								<div
									key={model}
									className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
								>
									<span className="text-sm font-medium">
										{getModelDisplayName(model)}
									</span>
									<div className="flex items-center gap-2">
										<span className="text-sm text-muted-foreground">
											{count}
										</span>
										<Badge className={getModelColor(model)}>{percentage}%</Badge>
									</div>
								</div>
							);
						})}
					</CardContent>
				</Card>
				)}

				{/* Operator Usage */}
				{operators && Object.keys(operators).length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="font-heading">Operator Usage</CardTitle>
						<p className="text-sm text-muted-foreground mt-1">
							LLM operator distribution
						</p>
					</CardHeader>
					<CardContent className="space-y-3">
						{Object.entries(operators).map(([operator, count]) => {
							const percentage = (
								(count / summary.totalCalls) *
								100
							).toFixed(0);
							const displayName =
								operator === "llm"
									? "LLM Eval"
									: operator === "sentiment"
										? "Sentiment"
										: operator === "quality_score"
											? "Quality Score"
											: operator;

							return (
								<div
									key={operator}
									className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
								>
									<span className="text-sm font-medium">{displayName}</span>
									<div className="flex items-center gap-2">
										<span className="text-sm text-muted-foreground">
											{count}
										</span>
										<Badge variant="secondary">{percentage}%</Badge>
									</div>
								</div>
							);
						})}
					</CardContent>
				</Card>
				)}
			</div>

			{/* Clear Dialog */}
			<AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Clear Analytics & Cache</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete all LLM analytics data and cached
							results. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => clearMutation.mutate()}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{clearMutation.isPending ? "Clearing..." : "Clear"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
