import { LanguageContext, LanguageModule, LanguageServiceHost } from '@volar/language-core';
import { LanguageService } from '@volar/language-service';
import type * as ts from 'typescript/lib/tsserverlibrary';
import type { DocumentContext, FileSystemProvider } from 'vscode-html-languageservice';
import type { SchemaRequestService } from 'vscode-json-languageservice';
import type * as vscode from 'vscode-languageserver-protocol';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { DocumentsAndSourceMaps } from './documents';

export * from 'vscode-languageserver-protocol';

export interface LanguageServiceRuntimeContext<Host extends LanguageServiceHost = LanguageServiceHost> {
	typescript: {
		module: typeof import('typescript/lib/tsserverlibrary');
		languageServiceHost: ts.LanguageServiceHost;
		languageService: ts.LanguageService;
	} | undefined;
	env: {
		rootUri: URI;
		locale?: string;
		configurationHost?: ConfigurationHost;
		documentContext: DocumentContext;
		fileSystemProvider?: FileSystemProvider;
		schemaRequestService?: SchemaRequestService;
	};
	uriToFileName(uri: string): string;
	fileNameToUri(fileName: string): string;

	/** @private */
	host: Host;
	/** @private */
	core: LanguageContext;
	/** @private */
	documents: DocumentsAndSourceMaps;
	/** @private */
	plugins: { [id: string]: LanguageServicePluginInstance; };
	/** @private */
	rules: { [id: string]: Rule | undefined; };
	/** @private */
	getTextDocument(uri: string): TextDocument | undefined;
	/** @private */
	ruleFixes?: {
		[uri: string]: {
			[ruleId: string]: {
				[ruleFixId: number]: [vscode.Diagnostic, RuleFix[]];
			};
		};
	};
};

export interface ConfigurationHost {
	getConfiguration: (<T> (section: string, scopeUri?: string) => Promise<T | undefined>),
	onDidChangeConfiguration: (cb: () => void) => void,
}

/**
 * LanguageServicePlugin
 */

export type NotNullableResult<T> = T | Thenable<T>;
export type NullableResult<T> = NotNullableResult<T | undefined | null>;
export type SemanticToken = [number, number, number, number, number];

export interface ExecuteCommandContext {
	token: vscode.CancellationToken;
	workDoneProgress: {
		begin(title: string, percentage?: number, message?: string, cancellable?: boolean): void;
		report(percentage: number): void;
		report(message: string): void;
		report(percentage: number, message: string): void;
		done(): void;
	};
	showReferences(params: {
		textDocument: vscode.TextDocumentIdentifier,
		position: vscode.Position,
		references: vscode.Location[],
	}): Promise<void>;
	applyEdit(paramOrEdit: vscode.ApplyWorkspaceEditParams | vscode.WorkspaceEdit): Promise<vscode.ApplyWorkspaceEditResult>;
}

export interface LanguageServicePlugin<T = {}> {
	(context: LanguageServiceRuntimeContext, service: LanguageService): LanguageServicePluginInstance & T;
}

export interface LanguageServicePluginInstance {

	rules?: {
		prepare?(context: RuleContext): NotNullableResult<RuleContext>;
	};

	validation?: {
		onSemantic?(document: TextDocument): NullableResult<vscode.Diagnostic[]>;
		onSyntactic?(document: TextDocument): NullableResult<vscode.Diagnostic[]>;
		onSuggestion?(document: TextDocument): NullableResult<vscode.Diagnostic[]>;
		onDeclaration?(document: TextDocument): NullableResult<vscode.Diagnostic[]>;
	};
	doHover?(document: TextDocument, position: vscode.Position): NullableResult<vscode.Hover>,
	findImplementations?(document: TextDocument, position: vscode.Position): NullableResult<vscode.LocationLink[]>;
	findReferences?(document: TextDocument, position: vscode.Position): NullableResult<vscode.Location[]>;
	findFileReferences?(document: TextDocument): NullableResult<vscode.Location[]>;
	findDocumentHighlights?(document: TextDocument, position: vscode.Position): NullableResult<vscode.DocumentHighlight[]>;
	findDocumentLinks?(document: TextDocument): NullableResult<vscode.DocumentLink[]>;
	findDocumentSymbols?(document: TextDocument): NullableResult<vscode.SymbolInformation[]>;
	findDocumentSemanticTokens?(document: TextDocument, range: vscode.Range, legend: vscode.SemanticTokensLegend): NullableResult<SemanticToken[]>;
	findWorkspaceSymbols?(query: string): NullableResult<vscode.SymbolInformation[]>;
	doExecuteCommand?(command: string, args: any[] | undefined, context: ExecuteCommandContext): NotNullableResult<void>;
	findDocumentColors?(document: TextDocument): NullableResult<vscode.ColorInformation[]>;
	getColorPresentations?(document: TextDocument, color: vscode.Color, range: vscode.Range): NullableResult<vscode.ColorPresentation[]>;
	doFileRename?(oldUri: string, newUri: string): NullableResult<vscode.WorkspaceEdit>;
	getFoldingRanges?(document: TextDocument): NullableResult<vscode.FoldingRange[]>;
	getSelectionRanges?(document: TextDocument, positions: vscode.Position[]): NullableResult<vscode.SelectionRange[]>;
	getSignatureHelp?(document: TextDocument, position: vscode.Position, context?: vscode.SignatureHelpContext): NullableResult<vscode.SignatureHelp>;
	format?(document: TextDocument, range: vscode.Range, options: vscode.FormattingOptions): NullableResult<vscode.TextEdit[]>;
	formatOnType?(document: TextDocument, position: vscode.Position, key: string, options: vscode.FormattingOptions): NullableResult<vscode.TextEdit[]>;

	definition?: {
		on?(document: TextDocument, position: vscode.Position): NullableResult<vscode.LocationLink[]>;
		onType?(document: TextDocument, position: vscode.Position): NullableResult<vscode.LocationLink[]>;
	};

	complete?: {
		triggerCharacters?: string[],
		isAdditional?: boolean,
		on?(document: TextDocument, position: vscode.Position, context?: vscode.CompletionContext): NullableResult<vscode.CompletionList>,
		resolve?(item: vscode.CompletionItem): NotNullableResult<vscode.CompletionItem>,
	};

	rename?: {
		prepare?(document: TextDocument, position: vscode.Position): NullableResult<vscode.Range | vscode.ResponseError<void>>;
		on?(document: TextDocument, position: vscode.Position, newName: string): NullableResult<vscode.WorkspaceEdit>;
	};

	codeAction?: {
		on?(document: TextDocument, range: vscode.Range, context: vscode.CodeActionContext): NullableResult<vscode.CodeAction[]>;
		resolve?(codeAction: vscode.CodeAction): NotNullableResult<vscode.CodeAction>;
	};

	codeLens?: {
		on?(document: TextDocument): NullableResult<vscode.CodeLens[]>;
		resolve?(codeLens: vscode.CodeLens): NotNullableResult<vscode.CodeLens>;
	};

	callHierarchy?: {
		prepare(document: TextDocument, position: vscode.Position): NullableResult<vscode.CallHierarchyItem[]>;
		onIncomingCalls(item: vscode.CallHierarchyItem): NotNullableResult<vscode.CallHierarchyIncomingCall[]>;
		onOutgoingCalls(item: vscode.CallHierarchyItem): NotNullableResult<vscode.CallHierarchyOutgoingCall[]>;
	};

	inlayHints?: {
		on?(document: TextDocument, range: vscode.Range): NullableResult<vscode.InlayHint[]>,
		// TODO: resolve
	};

	// html
	findLinkedEditingRanges?(document: TextDocument, position: vscode.Position): NullableResult<vscode.LinkedEditingRanges>;

	doAutoInsert?(document: TextDocument, position: vscode.Position, context: {
		lastChange: {
			range: vscode.Range;
			rangeOffset: number;
			rangeLength: number;
			text: string;
		};
	}): NullableResult<string | vscode.TextEdit>;

	/**
	 * TODO: only support to doCompleteResolve for now
	 */
	resolveEmbeddedRange?(range: vscode.Range): vscode.Range | undefined;
}

export type Rule = _Rule | NonNullable<_Rule['onSyntax']>;

export interface _Rule {
	onFormat?(ctx: RuleContext): void;
	onSyntax?(ctx: RuleContext): void;
	onSemantic?(ctx: RuleContext): void;
};

export interface RuleContext {
	// env context
	locale?: string;
	uriToFileName(uri: string): string;
	fileNameToUri(fileName: string): string;
	// project context
	rootUri: URI;
	getConfiguration?: ConfigurationHost['getConfiguration'];
	onDidChangeConfiguration?: ConfigurationHost['onDidChangeConfiguration'];
	// document context
	ruleId: string;
	document: TextDocument;
	report(error: vscode.Diagnostic, ...fixes: RuleFix[]): void;
}

export interface RuleFix {
	kinds?: (
		''
		| 'quickfix'
		| 'refactor'
		| 'refactor.extract'
		| 'refactor.inline'
		| 'refactor.rewrite'
		| 'source'
		| 'source.organizeImports'
		| 'source.fixAll'
	)[];
	title?: string;
	getEdits?(diagnostic: vscode.Diagnostic): NullableResult<vscode.TextEdit[]>;
	getWorkspaceEdit?(diagnostic: vscode.Diagnostic): NullableResult<vscode.WorkspaceEdit>;
}

export interface Config {
	languages?: { [id: string]: LanguageModule | undefined; },
	plugins?: { [id: string]: LanguageServicePlugin | LanguageServicePluginInstance | undefined; },
	rules?: { [id: string]: Rule | undefined; };
}
