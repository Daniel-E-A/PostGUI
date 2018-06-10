import React, { Component } from 'react';

import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';

import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import ListSubheader from '@material-ui/core/ListSubheader';
import Tooltip from '@material-ui/core/Tooltip';
import Snackbar from '@material-ui/core/Snackbar';

import IconButton from '@material-ui/core/IconButton';
import Button from '@material-ui/core/Button';
import LinkIcon from '@material-ui/icons/Link';
import DeleteIcon from '@material-ui/icons/Delete';
import CloseIcon from '@material-ui/icons/Close';
import { Divider } from '@material-ui/core';

import indigo from '@material-ui/core/colors/indigo';

let _ = require('lodash');
let lib = require("../utils/library.js");
let displayLengthCutoff = 50;

class HistoryPane extends Component {
	constructor(props) {
		super(props);

		let localHistoryArray = JSON.parse(localStorage.getItem("localHistory") ? localStorage.getItem("localHistory") : "[]");
		localHistoryArray = JSON.stringify(localHistoryArray) === "[]" ? null : localHistoryArray;

		// historyArray will have the latest URL at the end ... i.e. 0 position is the earliest query, and the highest position index is the latest query...
		// TODO: Need to make historyArray db specific!!!
		this.state = {
			historyPaneVisibility: this.props.historyPaneVisibility || false,
			newHistoryItem: this.props.newHistoryItem,
			displayIndex: -1,
			historyArray: localHistoryArray ? localHistoryArray : [],
			deleteHistoryDialogVisibility: this.props.classes.hide,
			snackBarVisibility: false,
			snackBarMessage: "Unknown error occured",
		};
		this.changeDisplayIndexDebounce = _.debounce(value => this.setState({ displayIndex: value }), 300);
	}

	// Keeps track of the incoming queries in an array
	componentWillReceiveProps(newProps) {
		this.setState({
			historyPaneVisibility: newProps.historyPaneVisibility
		});

		// If the incoming newHistoryItem isn't already the current state.newHistoryItem AND it actually exists THEN
		if (this.state.newHistoryItem !== newProps.newHistoryItem &&
			newProps.newHistoryItem !== [] &&
			newProps.newHistoryItem !== undefined &&
			newProps.newHistoryItem !== null &&
			newProps.newHistoryItem) {
			// Check if the new item already exists in the historyArray
			if (lib.inArray(newProps.newHistoryItem, this.state.historyArray) === false) { // doesn't exist, so insert it at highestIndex+1 position (i.e. 0th index is oldest)
				var arrayvar = this.state.historyArray.slice();
				arrayvar.push(newProps.newHistoryItem);

				this.setState({
					historyPaneVisibility: newProps.historyPaneVisibility,
					newHistoryItem: newProps.newHistoryItem,
					historyArray: arrayvar
				}, () => {
					localStorage.setItem("localHistory", JSON.stringify(this.state.historyArray));
				});
			} else { // already exists, move it to "top" (which in this case is the highest index...)
				this.setState({
					historyPaneVisibility: newProps.historyPaneVisibility,
					newHistoryItem: newProps.newHistoryItem,
					historyArray: lib.moveArrayElementFromTo(this.state.historyArray, lib.elementPositionInArray(newProps.newHistoryItem, this.state.historyArray), this.state.historyArray.length - 1)
				}, () => {
					localStorage.setItem("localHistory", JSON.stringify(this.state.historyArray));
				});
			}
		} else {
			// just make sure the (potentially) new visibility setting is saved...
			this.setState({
				historyPaneVisibility: newProps.historyPaneVisibility
			});
		}
	}

	// Loads the History Item in the Query Builder
	handleHistoryItemClick(index) {
		let url = this.state.historyArray[index][0];
		let rules = this.state.historyArray[index][1];
		//console.log("[",JSON.stringify(url),"," ,JSON.stringify(rules),"]");
		this.props.changeTable(this.extractTableNameFromURL(url, true));
		this.props.changeRules(rules);
	}

	// Inserts shareable URL to clipboard
	handleLinkIconClick(index) {
		let error = false, insertSuccess = false;

		let url = this.state.historyArray[index][0];
		let rules = this.state.historyArray[index][1];

		// Extract the table name from URL
		let tableRx = /\/\w+/g;
		let tableName = tableRx.exec(url.replace(lib.getDbConfig(this.props.dbIndex, "url"), ""));
		if (tableName) {
			tableName = tableName[0].replace(/\//g, "");
		} else {
			tableName = null;
			error = true;
		}

		// Create the URL needed for sharing
		let shareUrl = "";
		if (!error) {
			shareUrl = window.location.origin + "/queryBuilder/db/" + this.props.dbIndex + "/table/" + tableName;
			if (rules !== null) {
				shareUrl += "?query=" + encodeURIComponent(JSON.stringify(rules));
			}

			// Insert to clipboard
			insertSuccess = this.insertToClipboard(shareUrl);
		}

		// if no errors, show a successfully inserted message to user...
		if (!error && insertSuccess) {
			this.setState({
				snackBarVisibility: true,
				snackBarMessage: "Link copied!",
			}, () => {
				this.timer = setTimeout(() => {
					this.setState({
						snackBarVisibility: false,
						snackBarMessage: "Unknown error"
					});
				}, 2500);
			});
		}
	}

	insertToClipboard(str) {
		//based on https://stackoverflow.com/a/12693636
		document.oncopy = function (event) {
			event.clipboardData.setData("Text", str);
			event.preventDefault();
		};
		let copySuccess = document.execCommand("Copy");
		document.oncopy = undefined;
		return copySuccess;
	}

	closeDrawer() {
		this.props.closeHistoryPane();
		this.setState({
			historyPaneVisibility: false,
		});
	}

	extractTableNameFromURL(url, getRaw = false) {
		let rawTableName = url.replace(lib.getDbConfig(this.props.dbIndex, "url"), "").replace(/\?.*/, "").replace(/\s/g, "").replace("/", "");

		if (getRaw) { return rawTableName; }

		let tableRename = lib.getTableConfig(this.props.dbIndex, rawTableName, "rename");
		let displayName = tableRename ? tableRename : rawTableName;

		return displayName;
	}

	cleanUpRules(url) {
		return url.replace(lib.getDbConfig(this.props.dbIndex, "url"), "").replace(/.*\?/, "").replace(/&/g, "\n").replace(/,/g, ",\n").replace(/limit=\d*/g, "");
	}

	recursiveRulesExtraction(rules, condition, depth = 0) {
		let rulesArray = [];
		if (rules.length > 1) {
			rulesArray = [[Array(depth).join("\t") + condition]];
		}
		for (let i = 0; i < rules.length; i++) {
			let potentialName = rules[i]['field'];
			if (potentialName !== null && potentialName !== undefined) {
				rulesArray.push([Array(depth + 1).join("\t") + potentialName, rules[i]['operator'], rules[i]['value']]);
			} else {
				// Check if it's a GROUP by looking for "condition" key
				if (rules[i]['condition'] === "AND" || rules[i]['condition'] === "OR") {
					let subGroupRules = this.recursiveRulesExtraction(rules[i]['rules'], rules[i]['condition'], depth + 1);
					for (let ii = 0; ii < subGroupRules.length; ii++) {
						if (subGroupRules[ii] !== null && subGroupRules[ii] !== undefined) {
							rulesArray.push(subGroupRules[ii]);
						}
					}
				}
			}
		}
		return rulesArray;
	}

	changeDisplayIndex(newDisplayIndex) {
		this.changeDisplayIndexDebounce(newDisplayIndex);
	}

	showDeleteHistoryDialog() {
		const classes = this.props.classes;
		if (this.state.deleteHistoryDialogVisibility === null) {
			this.setState({
				deleteHistoryDialogVisibility: classes.hide
			});
		} else {
			this.setState({
				deleteHistoryDialogVisibility: null
			});
		}
	}

	deleteHistory() {
		this.setState({
			historyArray: []
		}, () => {
			localStorage.setItem("localHistory", []);
		});
		this.showDeleteHistoryDialog();
	}


	render() {
		const classes = this.props.classes;
		const historyPanelItemsList = (
			<div className={classes.list}>
				<List
					dense
					subheader={<ListSubheader>Query History
								<IconButton style={{ float: "right" }}
							aria-label="Close"
							onClick={this.closeDrawer.bind(this)}>
							<CloseIcon />
						</IconButton>
						<IconButton style={{ float: "right" }}
							aria-label="Delete"
							onClick={this.showDeleteHistoryDialog.bind(this)}>
							<DeleteIcon />
						</IconButton>
					</ListSubheader>}>

					{/* Delete History Button and Dialog */}
					<div style={{ height: "100px", width: "100%", marginLeft: "130px" }} className={this.state.deleteHistoryDialogVisibility}>
						<ListSubheader style={{ marginLeft: "10px" }}>Delete history?</ListSubheader>
						<Button onClick={this.deleteHistory.bind(this)} variant="raised" style={{ margin: "5px" }}>Yes</Button>
						<Button onClick={this.showDeleteHistoryDialog.bind(this)} variant="raised" color="primary" style={{ margin: "5px" }}>No</Button>
					</div>

					<Divider />

					{/* History Items List */}
					{
						this.state.historyArray.slice(0).reverse().map((item) => {
							// Item[0] is the URL
							// Item[1] are the rules?

							// Display the current item iff it belongs to currently active db
							if (item[0].indexOf(lib.getDbConfig(this.props.dbIndex, "url")) >= 0) {

								let tableName = this.extractTableNameFromURL(item[0]);
								if (tableName.length > displayLengthCutoff) {
									tableName = tableName.substring(0, displayLengthCutoff) + "...";
								}

								// If there are rules are present, then display it with limited number of rows for rules
								if (item[0] && item[1]) {
									let rules = this.recursiveRulesExtraction(item[1]['rules'], item[1]['condition'], 0);
									let index = lib.elementPositionInArray(item, this.state.historyArray);

									// When user hovers over a history item, show rest of the lines
									let classNames = this.props.classes.hide;
									if (this.state.displayIndex === index) {
										classNames = null;
									}


									return (
										<ListItem button key={index} onMouseEnter={this.changeDisplayIndex.bind(this, index)} onClick={this.handleHistoryItemClick.bind(this, index)}>
											{/* Clicking on this edit button should load the history item in the Query Builder */}
											<Tooltip id="tooltip-bottom" title={"Copy shareable link"} placement="bottom">
												<ListItemIcon className={classes.noStyleButton} onClick={this.handleLinkIconClick.bind(this, index)}>
													<LinkIcon />
												</ListItemIcon>
											</Tooltip>

											{/* Nicely formatted history item */}
											<div>
												<ListItemText primary={tableName} />
												{
													rules.map((rule) => {
														let displayStr = "";
														let columnName = "";
														let displayName = "";
														let rawOperator = "";
														let niceOperator = "";
														for (let i = 0; i < rule.length; i++) {
															displayStr += " " + rule[i] + " ";
															// if there are more than 1 rules (i.e. it's not AND/OR only) then extract column name
															if (i === 1) {
																columnName = rule[0].replace(/\s/g, "");
																rawOperator = rule[1].replace(/\s/g, "");
																niceOperator = lib.translateOperatorToHuman(rawOperator);
															}
														}

														// find column's rename rules from config
														if (columnName) {
															let columnRename = lib.getColumnConfig(this.props.dbIndex, this.extractTableNameFromURL(item[0], true), columnName, "rename");
															displayName = columnRename ? columnRename : columnName;
														}

														displayStr = displayStr.replace(columnName, displayName).replace(rawOperator, niceOperator).replace(/\t/g, " . . ");
														let currRuleIndexInRules = lib.elementPositionInArray(rule, rules);

														if (displayStr.length > displayLengthCutoff) {
															displayStr = displayStr.substring(0, displayLengthCutoff) + "...";
														}

														return <ListItemText secondary={displayStr} key={index + rule} className={currRuleIndexInRules > 3 ? classNames : null} />;
													})
												}
											</div>
										</ListItem>
									);
								} else { // If only table name is present, then display just a table name
									let index = lib.elementPositionInArray(item, this.state.historyArray);

									return (
										<ListItem button key={index} onMouseEnter={this.changeDisplayIndex.bind(this, index)} onClick={this.handleHistoryItemClick.bind(this, index)}>

											<Tooltip id="tooltip-bottom" title={"Copy shareable link"} placement="bottom">
												<ListItemIcon className={classes.noStyleButton} onClick={this.handleLinkIconClick.bind(this, index)}>
													<LinkIcon />
												</ListItemIcon>
											</Tooltip>

											<div>
												<ListItemText primary={tableName} />
												<ListItemText secondary={"Get random rows..."} key={index + tableName} />
											</div>
										</ListItem>
									);
								}
							} else {
								return null;
							}
						})
					}
				</List>
				<Snackbar anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
					open={this.state.snackBarVisibility}
					onClose={this.handleRequestClose}
					SnackbarContentProps={{ 'aria-describedby': 'message-id', }}
					message={<span id="message-id">{this.state.snackBarMessage}</span>}
					action={[<IconButton key="close" aria-label="Close" color="secondary" className={classes.close} onClick={this.handleRequestClose}> <CloseIcon /> </IconButton>]} />
			</div>
		);

		return (
			<Drawer anchor="right" open={this.state.historyPaneVisibility} onClose={this.closeDrawer.bind(this)}>
				<div tabIndex={0} role="button">
					{historyPanelItemsList}
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
		width: '30%',
		height: '100%',
		float: 'right'
	},
	list: {
		width: 400,
	},
	listFull: {
		width: 'auto',
	},
	noStyleButton: {
		border: "none",
		fill: indigo[500]
	},
	hide: {
		display: 'none'
	}
};

export default withStyles(styleSheet)(HistoryPane);