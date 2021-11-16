import { CButton, CModal, CModalBody, CModalFooter, CModalHeader } from '@coreui/react';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';

interface IGenericConfirmModalProps {}

type ModalData = [title: string, message: string, buttonLabel: string, cb: () => void];

export interface IGenericConfirmModalHandle {
	show(title: string, message: string, buttonLabel: string, cb: () => void): void;
}

export const GenericConfirmModal = forwardRef<IGenericConfirmModalHandle, IGenericConfirmModalProps>(
	function GenericConfirmModal(
		_props: React.PropsWithChildren<IGenericConfirmModalProps>,
		ref: React.ForwardedRef<IGenericConfirmModalHandle>,
	) {
		const [data, setData] = useState<ModalData | null>(null);
		const [show, setShow] = useState(false);

		const doClose = useCallback(() => setShow(false), []);
		const onClosed = useCallback(() => setData(null), []);
		const doAction = useCallback(() => {
			setData(null);
			setShow(false);

			// completion callback
			if (data) {
				const cb = data[3];
				cb();
			}
		}, [data]);

		useImperativeHandle(
			ref,
			() => ({
				show(title, message, buttonLabel, completeCallback) {
					setData([title, message, buttonLabel, completeCallback]);
					setShow(true);
				},
			}),
			[],
		);

		return (
			<CModal show={show} onClose={doClose} onClosed={onClosed}>
				<CModalHeader closeButton>
					<h5>{data?.[0]}</h5>
				</CModalHeader>
				<CModalBody>
					<p>{data?.[1]}</p>
				</CModalBody>
				<CModalFooter>
					<CButton color='secondary' onClick={doClose}>
						Cancel
					</CButton>
					<CButton color='primary' onClick={doAction}>
						{data?.[2]}
					</CButton>
				</CModalFooter>
			</CModal>
		);
	},
);
