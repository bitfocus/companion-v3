import React from 'react';
import './App.scss';
import { Switch, BrowserRouter as Router, Route } from 'react-router-dom';
import { Form, Nav, Navbar, Button } from 'react-bootstrap';
import { LinkContainer, IndexLinkContainer } from 'react-router-bootstrap';
import SocketIOClient from 'socket.io-client';
import { AuthStatusContext, AuthStatusLink, BackendLinkContext } from './BackendContext';
import { AuthComponentWrapper } from './AuthWrapper';
import { IModule } from '../shared/collections';
import { Observable, Subject } from 'rxjs';
import shortid from 'shortid';
import { SubscriptionEvent } from '../shared/subscription';
import { SocketCommand, SubscribeMessage } from '../shared/api';
import { literal } from '../shared/util';

const socket = SocketIOClient.io();
socket.on('connect', () => {
	console.log('socket.io connected');
});
socket.on('disconnect', () => {
	console.log('socket.io disconnected');
});
// const database = new DatabaseManager();

export type unsub = () => void;

// TODO - how can the query be typed?
export interface SubscribeQuery {
	doc: string;
	query?: never;
}
function subscribe<T extends { _id: string }>(doc: string, query?: never): [Observable<T[]>, unsub] {
	const subId = shortid();
	socket.emit(
		SocketCommand.Subscribe,
		literal<SubscribeMessage>({
			id: subId,
			doc,
			query,
		}),
	);

	const sub = new Subject<T[]>();
	const fullData = new Map<string, T>();
	sub.next(Array.from(fullData.values()));

	socket.on(subId, (msg: SubscriptionEvent<T>) => {
		switch (msg.event) {
			case 'init':
				fullData.clear();
				for (const d of msg.docs) {
					fullData.set(d._id, d);
				}
				break;
			case 'change':
				fullData.set(msg.doc._id, msg.doc);
				break;
			case 'remove':
				fullData.delete(msg.docId);
				break;
			case 'error':
				// TODO
				console.error('got error', msg.message);
				break;
		}
		sub.next(Array.from(fullData.values()));
	});

	return [
		sub,
		() => {
			socket.off(subId);
			socket.emit(SocketCommand.Unsubscribe, {
				id: subId,
			});
		},
	];
}

(window as any).socket = socket; // TODO - temporary
// (window as any).db = database; // TODO - temporary

class TmpPage extends React.Component {
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
									{({}) => {
										return (
											<div>
												<ModuleList />
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

class ModuleList extends React.Component<unknown, { modules: Array<IModule> }> {
	private readonly subs: Array<() => void> = [];

	constructor(props: ModuleList['props']) {
		super(props);

		this.state = {
			modules: [],
		};
	}
	async componentDidMount() {
		const [sub, unsub] = subscribe<IModule>('modules');
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

class App extends React.Component {
	render(): React.ReactElement {
		return (
			<Router>
				<AuthComponentWrapper socket={socket}>
					<div>
						<Navbar bg='dark' variant='dark'>
							<LinkContainer to='/'>
								<Navbar.Brand>Companion3</Navbar.Brand>
							</LinkContainer>
							<Nav className='mr-auto'>
								<IndexLinkContainer to='/'>
									<Nav.Link>Home</Nav.Link>
								</IndexLinkContainer>
							</Nav>
							<Form inline>
								{/* {this.renderDeviceSelection()} */}

								<Button variant='outline-info'>Search</Button>
							</Form>
						</Navbar>

						<Switch>
							<Route exact path='/'>
								<TmpPage />
							</Route>
						</Switch>
					</div>
				</AuthComponentWrapper>
			</Router>
		);
	}
}
export default App;
