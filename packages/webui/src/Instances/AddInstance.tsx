import React, { memo, useContext, useState } from 'react';
import { CAlert, CButton, CInput, CInputGroup, CInputGroupAppend } from '@coreui/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestionCircle, faTimes } from '@fortawesome/free-solid-svg-icons';
import { CompanionContext, socketEmit } from '../util';

export function AddInstancesPanel({
	showHelp,
	doConfigureInstance,
}: {
	showHelp: (moduleId: string) => void;
	doConfigureInstance: (id: string) => void;
}) {
	return (
		<>
			<AddInstancesInner showHelp={showHelp} configureInstance={doConfigureInstance} />
		</>
	);
}

const AddInstancesInner = memo(function AddInstancesInner({
	showHelp,
	configureInstance,
}: {
	showHelp: (moduleId: string) => void;
	configureInstance: (id: string) => void;
}) {
	const context = useContext(CompanionContext);
	const [filter, setFilter] = useState('');

	const addInstance = (type: string, product: string) => {
		// socketEmit(context.socket, 'instance_add', [{ type: type, product: product }])
		// 	.then(([id]) => {
		// 		setFilter('');
		// 		console.log('NEW INSTANCE', id);
		// 		configureInstance(id);
		// 	})
		// 	.catch((e) => {
		// 		context.notifier.current.show(`Failed to create connection`, e);
		// 		console.error('Failed to create connection:', e);
		// 	});
	};

	const candidates = [];
	try {
		const regexp = new RegExp(filter, 'i');

		for (const module of Object.values(context.modules ?? {})) {
			const products = new Set(module.products);
			for (const subprod of products) {
				const id = module.name;
				const name = `${module.manufacturer} ${subprod}`;
				const keywords = module.keywords || [];

				if (name.replace(';', ' ').match(regexp) || keywords.find((kw) => kw.match(regexp))) {
					candidates.push(
						<div key={name + id}>
							<CButton color='primary' onClick={() => addInstance(id, subprod)}>
								Add
							</CButton>
							&nbsp;
							{name}
							{module.hasHelp ? (
								<div className='instance_help' onClick={() => showHelp(id)}>
									<FontAwesomeIcon icon={faQuestionCircle} />
								</div>
							) : (
								''
							)}
						</div>,
					);
				}
			}
		}
	} catch (e) {
		console.error('Failed to compile candidates list:', e);

		candidates.splice(0, candidates.length);
		candidates.push(
			<CAlert color='warning' role='alert'>
				Failed to build list of modules:
				<br />
				{e}
			</CAlert>,
		);
	}

	return (
		<div style={{ clear: 'both' }}>
			<h4>Add connection</h4>
			<p>
				Companion currently supports {(context.modules ?? []).length} different things, and the list grows every
				day. If you can't find the device you're looking for, please{' '}
				<a target='_new' href='https://github.com/bitfocus/companion-module-requests'>
					add a request
				</a>{' '}
				on GitHub
			</p>
			<CInputGroup>
				<CInput
					type='text'
					placeholder='Search ...'
					onChange={(e) => setFilter(e.currentTarget.value)}
					value={filter}
					style={{ fontSize: '1.2em' }}
				/>
				<CInputGroupAppend>
					<CButton color='danger' onClick={() => setFilter('')}>
						<FontAwesomeIcon icon={faTimes} />
					</CButton>
				</CInputGroupAppend>
			</CInputGroup>
			<div id='instance_add_search_results'>{candidates}</div>
		</div>
	);
});
