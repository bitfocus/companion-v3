import React from 'react';
import { IModule } from '@shared/dist/collections';
import { AuthStatusContext, BackendLinkContext, AuthStatusLink } from './BackendContext';
import { subscribeToCollection } from './lib/subscription';
import SocketIOClient from 'socket.io-client';

export class TmpPage extends React.Component {
	render() {
		return (
			<div>
				<p>Temporary</p>
				<AuthStatusContext.Consumer>
					{(p) => (
						<div>
							<TmpInner {...p} />
							{p.userInfo ? (
								<BackendLinkContext.Consumer>
									{({ socket }) => {
										return (
											<div>
												<ModuleList socket={socket} />
											</div>
										);
									}}
								</BackendLinkContext.Consumer>
							) : (
								''
							)}
						</div>
					)}
				</AuthStatusContext.Consumer>
			</div>
		);
	}
}

class ModuleList extends React.Component<{ socket: SocketIOClient.Socket }, { modules: Array<IModule> }> {
	private readonly subs: Array<() => void> = [];

	constructor(props: ModuleList['props']) {
		super(props);

		this.state = {
			modules: [],
		};
	}
	async componentDidMount() {
		const [sub, unsub] = subscribeToCollection<IModule>(this.props.socket, 'modules');
		// const [sub, unsub] = gqlSubscribeArray<IModule>(
		// 	{
		// 		query: 'subscription { instances { type data { id name version} } }',
		// 	},
		// 	'instances',
		// );
		this.subs.push(unsub);
		sub.subscribe((v) => {
			this.setState({
				modules: v,
			});
		});
	}
	componentWillUnmount() {
		this.subs.forEach((sub) => sub());
	}
	render() {
		return (
			<div>
				<h3>Modules:</h3>
				{this.state.modules.map((mod) => (
					<p key={mod._id}>
						{mod.name} @ {mod.version}
					</p>
				))}
			</div>
		);
	}
}

class TmpInner extends React.Component<AuthStatusLink, { time: number }> {
	private interval: any;

	constructor(props: any) {
		super(props);

		this.state = {
			time: Date.now(),
		};
	}
	componentDidMount() {
		this.interval = setInterval(() => this.setState({ time: Date.now() }), 1000);
	}
	componentWillUnmount() {
		clearInterval(this.interval);
	}

	render() {
		return (
			<div>
				<p>Abc - {this.props.userInfo?.name ?? '---'}</p>
				<p>
					<button onClick={() => this.props.doLogin('admin', 'password')}>Login</button>
				</p>
				<p>
					<button onClick={() => this.props.doLogout()}>Logout</button>
				</p>
			</div>
		);
	}
}
