import React, { forwardRef, memo, useCallback, useImperativeHandle, useState } from 'react';
import { CModal, CModalBody, CModalHeader, CModalFooter, CButton } from '@coreui/react';
import sanitizeHtml from 'sanitize-html';
import marked from 'marked';

interface IHelpModalProps {}

export interface IHelpModalHandle {
	show(name: string, description: { markdown: string; baseUrl: string }): void;
}

export const HelpModal = memo(
	forwardRef<IHelpModalHandle, IHelpModalProps>(function HelpModal(
		_props: React.PropsWithChildren<IHelpModalProps>,
		ref: React.ForwardedRef<IHelpModalHandle>,
	) {
		const [content, setContent] = useState<[string, { markdown: string; baseUrl: string }] | null>(null);
		const [show, setShow] = useState(false);

		const doClose = useCallback(() => setShow(false), []);
		const onClosed = useCallback(() => setContent(null), []);

		useImperativeHandle(
			ref,
			() => ({
				show(name: string, description: { markdown: string; baseUrl: string }) {
					setContent([name, description]);
					setShow(true);
				},
			}),
			[],
		);

		const html = content
			? {
					__html: sanitizeHtml(marked(content[1].markdown, { baseUrl: content[1].baseUrl })),
			  }
			: undefined;

		return (
			<CModal show={show} onClose={doClose} onClosed={onClosed} size='lg'>
				<CModalHeader closeButton>
					<h5>Help for {content?.[0]}</h5>
				</CModalHeader>
				<CModalBody>
					<div dangerouslySetInnerHTML={html} />
				</CModalBody>
				<CModalFooter>
					<CButton color='secondary' onClick={doClose}>
						Close
					</CButton>
				</CModalFooter>
			</CModal>
		);
	}),
);
