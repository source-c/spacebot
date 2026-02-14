import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

type IdentityField = "soul" | "identity" | "user";

const IDENTITY_FIELDS: { key: IdentityField; label: string; file: string; description: string }[] = [
	{
		key: "soul",
		label: "Soul",
		file: "SOUL.md",
		description: "Personality, values, communication style, boundaries",
	},
	{
		key: "identity",
		label: "Identity",
		file: "IDENTITY.md",
		description: "Name, nature, purpose",
	},
	{
		key: "user",
		label: "User",
		file: "USER.md",
		description: "The human this agent interacts with: name, preferences, context",
	},
];

interface AgentConfigProps {
	agentId: string;
}

export function AgentConfig({ agentId }: AgentConfigProps) {
	const queryClient = useQueryClient();
	const [activeField, setActiveField] = useState<IdentityField>("soul");

	const { data, isLoading, isError } = useQuery({
		queryKey: ["agent-identity", agentId],
		queryFn: () => api.agentIdentity(agentId),
		staleTime: 10_000,
	});

	const mutation = useMutation({
		mutationFn: (update: { field: IdentityField; content: string }) =>
			api.updateIdentity({
				agent_id: agentId,
				[update.field]: update.content,
			}),
		onSuccess: (result) => {
			queryClient.setQueryData(["agent-identity", agentId], result);
		},
	});

	const active = IDENTITY_FIELDS.find((f) => f.key === activeField)!;

	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="flex items-center gap-2 text-ink-dull">
					<div className="h-2 w-2 animate-pulse rounded-full bg-accent" />
					Loading identity files...
				</div>
			</div>
		);
	}

	if (isError) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="text-sm text-red-400">Failed to load identity files</p>
			</div>
		);
	}

	return (
		<div className="flex h-full">
			{/* Sidebar */}
			<div className="flex w-52 flex-shrink-0 flex-col border-r border-app-line/50 bg-app-darkBox/20">
				<div className="px-3 pb-1 pt-4">
					<span className="text-tiny font-medium uppercase tracking-wider text-ink-faint">
						Identity
					</span>
				</div>
				<div className="flex flex-col gap-0.5 px-2">
					{IDENTITY_FIELDS.map((field) => {
						const isActive = activeField === field.key;
						const hasContent = !!data?.[field.key]?.trim();
						return (
							<button
								key={field.key}
								onClick={() => setActiveField(field.key)}
								className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
									isActive
										? "bg-app-darkBox text-ink"
										: "text-ink-dull hover:bg-app-darkBox/50 hover:text-ink"
								}`}
							>
								<span className="flex-1">{field.label}</span>
								{!hasContent && (
									<span className="rounded bg-amber-500/10 px-1 py-0.5 text-tiny text-amber-400/70">
										empty
									</span>
								)}
							</button>
						);
					})}
				</div>
			</div>

			{/* Editor */}
			<div className="flex flex-1 flex-col overflow-hidden">
				<IdentityEditor
					key={active.key}
					label={active.label}
					file={active.file}
					description={active.description}
					content={data?.[active.key] ?? null}
					saving={mutation.isPending}
					onSave={(content) => mutation.mutate({ field: active.key, content })}
				/>
			</div>
		</div>
	);
}

interface IdentityEditorProps {
	label: string;
	file: string;
	description: string;
	content: string | null;
	saving: boolean;
	onSave: (content: string) => void;
}

function IdentityEditor({ label, file, description, content, saving, onSave }: IdentityEditorProps) {
	const [value, setValue] = useState(content ?? "");
	const [dirty, setDirty] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Sync external data into local state when query data changes (and not dirty)
	useEffect(() => {
		if (!dirty) {
			setValue(content ?? "");
		}
	}, [content, dirty]);

	const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
		setValue(event.target.value);
		setDirty(true);
	}, []);

	const handleSave = useCallback(() => {
		onSave(value);
		setDirty(false);
	}, [onSave, value]);

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key === "s") {
				event.preventDefault();
				if (dirty) handleSave();
			}
		},
		[dirty, handleSave],
	);

	const handleRevert = useCallback(() => {
		setValue(content ?? "");
		setDirty(false);
	}, [content]);

	return (
		<>
			{/* Header bar */}
			<div className="flex items-center justify-between border-b border-app-line/50 bg-app-darkBox/20 px-5 py-2.5">
				<div className="flex items-center gap-3">
					<h3 className="text-sm font-medium text-ink">{label}</h3>
					<span className="rounded bg-app-darkBox px-1.5 py-0.5 font-mono text-tiny text-ink-faint">
						{file}
					</span>
					<span className="text-tiny text-ink-faint">{description}</span>
				</div>
				<div className="flex items-center gap-2">
					{dirty && (
						<>
							<button
								onClick={handleRevert}
								className="rounded-md px-2.5 py-1 text-tiny font-medium text-ink-faint transition-colors hover:bg-app-darkBox hover:text-ink-dull"
							>
								Revert
							</button>
							<button
								onClick={handleSave}
								disabled={saving}
								className="rounded-md bg-accent/15 px-2.5 py-1 text-tiny font-medium text-accent transition-colors hover:bg-accent/25 disabled:opacity-50"
							>
								{saving ? "Saving..." : "Save"}
							</button>
						</>
					)}
					{!dirty && (
						<span className="text-tiny text-ink-faint/50">Cmd+S to save</span>
					)}
				</div>
			</div>

			{/* Textarea fills remaining space */}
			<div className="flex-1 overflow-y-auto p-4">
				<textarea
					ref={textareaRef}
					value={value}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					placeholder={`Write ${label.toLowerCase()} content here...`}
					className="h-full w-full resize-none rounded-md border border-transparent bg-app-darkBox/30 px-4 py-3 font-mono text-sm leading-relaxed text-ink-dull placeholder:text-ink-faint/40 focus:border-accent/30 focus:outline-none"
					spellCheck={false}
				/>
			</div>
		</>
	);
}
