import React from 'react';
import './App.scss';
import { Switch, BrowserRouter as Router, Route } from 'react-router-dom';
import { Form, Nav, Navbar, Button } from 'react-bootstrap';
import { LinkContainer, IndexLinkContainer } from 'react-router-bootstrap';
import io from 'socket.io-client';
import { BackendLinkContext } from './BackendContext';
import { DatabaseManager } from './database';

const socket = io();
socket.on('connect', () => {
	console.log('socket.io connected');
});
socket.on('disconnect', () => {
	console.log('socket.io disconnected');
});
const database = new DatabaseManager();

(window as any).socket = socket; // TODO - temporary
(window as any).db = database; // TODO - temporary

class TmpPage extends React.Component {
	render() {
		return (
			<div>
				<p>Temporary</p>
				<BackendLinkContext.Consumer>{({ db }) => <TmpInner db={db} />}</BackendLinkContext.Consumer>
			</div>
		);
	}
}

class TmpInner extends React.Component<{ db: DatabaseManager }, { time: number }> {
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
				<p>Abc - {this.props.db.isLoggedIn() ? 'Y' : 'N'}</p>
				<p>
					<button onClick={() => this.props.db.login('admin', 'admin')}>Login</button>
				</p>
				<p>
					<button onClick={() => this.props.db.logout()}>Logout</button>
				</p>
			</div>
		);
	}
}

class App extends React.Component {
	constructor(props: any) {
		super(props);

	}
	render() {
		return (
			<Router>
				<BackendLinkContext.Provider value={{ socket, db: database }}>
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
				</BackendLinkContext.Provider>
			</Router>
		);
	}
}
export default App;
