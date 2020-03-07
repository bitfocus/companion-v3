import React from 'react';
import './App.scss';
import { Switch, BrowserRouter as Router, Route } from 'react-router-dom';
import { Form, Nav, Navbar, Button } from 'react-bootstrap';
import { LinkContainer, IndexLinkContainer } from 'react-router-bootstrap';
import io from 'socket.io-client';
import SocketContext from './SocketContext';

const socket = io();
socket.on('connect', () => {
	console.log('socket.io connected');
});
socket.on('disconnect', () => {
	console.log('socket.io disconnected');
});
(window as any).socket = socket; // TODO - temporary

class TmpPage extends React.Component {
	render() {
		return <p>Temporary</p>;
	}
}

class App extends React.Component {
	render() {
		return (
			<Router>
				<SocketContext.Provider value={socket}>
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
				</SocketContext.Provider>
			</Router>
		);
	}
}
export default App;
