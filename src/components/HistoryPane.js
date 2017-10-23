import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import Divider from 'material-ui/Divider';
import Drawer from 'material-ui/Drawer';
//import Button from 'material-ui/Button';
import List, { ListItem, ListItemIcon, ListItemText } from 'material-ui/List';
import InboxIcon from 'material-ui-icons/Inbox';
import DraftsIcon from 'material-ui-icons/Drafts';

class HistoryPane extends Component {
	constructor(props) {
		super(props);
		this.state = {
			historyPaneVisibility: this.props.historyPaneVisibility || true,
			url: this.props.url,
			urlArray: []
		};
	}

	componentWillReceiveProps(newProps) {
		var arrayvar = this.state.urlArray.slice();
		arrayvar.push(newProps.url);
		this.setState({
			historyPaneVisibility: newProps.historyPaneVisibility,
			url: newProps.url,
			urlArray: arrayvar
		});
	}

	closeDrawer() {
		this.props.closeHistoryPane();
		this.setState({
			historyPaneVisibility: false,
		});
	};

	render() {
		const classes = this.props.classes;
		const sideList = (
			<div className={classes.list}>
				<p>{this.state.urlArray.join(', ')}</p>
				<List>
					<ListItem button>
						<ListItemIcon>
							<InboxIcon />
						</ListItemIcon>
						<ListItemText primary="Inbox" />
					</ListItem>
					<ListItem button>
						<ListItemIcon>
							<DraftsIcon />
						</ListItemIcon>
						<ListItemText primary="Drafts" />
					</ListItem>
				</List>
				<Divider />
				<List>
					<ListItem button>
						<ListItemText primary="Trash" />
					</ListItem>
					<ListItem button component="a" href="#simple-list">
						<ListItemText primary="Spam" />
					</ListItem>
				</List>
			</div>
		);

		return (
			<Drawer anchor="right" open={this.state.historyPaneVisibility} onRequestClose={this.closeDrawer.bind(this)}>
				<div tabIndex={0} role="button">
					{sideList}
				</div>
			</Drawer>
		);
	}
}

HistoryPane.propTypes = {
	classes: PropTypes.object.isRequired,
};

const styleSheet = {
	root: {
		width: '20%',
		height: '100%',
		float: 'right'
	},
	list: {
		width: 250,
	},
	listFull: {
		width: 'auto',
	}
};

export default withStyles(styleSheet)(HistoryPane);