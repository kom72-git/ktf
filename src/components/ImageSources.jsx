import React from 'react';
import { replaceAbbreviations } from '../utils/formatovaniTextu.jsx';

const SEPARATOR_REGEX = /\s*(?:,|;|\||\ba\b)\s*/gi;

const renderAbbrevContent = (value, keyPrefix) => {
	if (Array.isArray(value)) {
		return value.map((part, idx) => (
			<React.Fragment key={`${keyPrefix}-${idx}`}>{part}</React.Fragment>
		));
	}
	return value;
};

const renderAuthorSegments = (text, keyPrefix) => {
	const segments = [];
	const regex = /\([^)]*\)/g;
	let lastIndex = 0;
	let match;
	while ((match = regex.exec(text)) !== null) {
		const idx = match.index;
		if (idx > lastIndex) {
			segments.push({ text: text.slice(lastIndex, idx), highlight: true });
		}
		segments.push({ text: match[0], highlight: false });
		lastIndex = idx + match[0].length;
	}
	if (lastIndex < text.length) {
		segments.push({ text: text.slice(lastIndex), highlight: true });
	}
	if (!segments.length) segments.push({ text, highlight: true });

	return segments
		.map((segment, idx) => {
			const content = replaceAbbreviations(segment.text);
			if (content === null || content === undefined || content === '') return null;
			if (segment.highlight) {
				return (
					<span key={`${keyPrefix}-highlight-${idx}`} className="study-note-authors-highlight">
						{renderAbbrevContent(content, `${keyPrefix}-highlight-${idx}`)}
					</span>
				);
			}
			return (
				<React.Fragment key={`${keyPrefix}-text-${idx}`}>
					{renderAbbrevContent(content, `${keyPrefix}-text-${idx}`)}
				</React.Fragment>
			);
		})
		.filter(Boolean);
};

export default function ImageSources({ value = '', className = '' }) {
	const raw = typeof value === 'string' ? value.trim() : '';
	if (!raw) return null;
	const authorsArr = raw.split(SEPARATOR_REGEX).map(s => s.trim()).filter(Boolean);
	const count = authorsArr.length;
	const title = count === 1 ? 'Zdroj obrázků' : 'Zdroje obrázků';

	const authorNodes = [];
	authorsArr.forEach((author, idx) => {
		const segments = renderAuthorSegments(author, `author-${idx}`);
		authorNodes.push(...segments);
			if (idx < authorsArr.length - 1) {
				authorNodes.push(
					<span
						key={`delimiter-${idx}`}
						aria-hidden="true"
						className="study-note-authors-delimiter"
					>
						, {/* Oddělovač jednotlivých zdrojů lze zde upravit (např. tečka, bodka nebo jiný symbol). */}
					</span>
				);
			}
	});

	if (!authorNodes.length) return null;

	return (
		<div className={`study-note study-note-authors ${className}`.trim()}>
			<div className="study-note-authors-heading">
				<span>{title}</span>
				<span className="study-note-authors-count">({count})</span>
			</div>
			<span className="study-note-authors-line">
				{authorNodes}
			</span>
		</div>
	);
}

