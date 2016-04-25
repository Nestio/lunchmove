import React, { Component } from 'react';
import moment from 'moment';
import classNames from 'classnames';
import { fetchSpotsIfNeeded, fetchMovesIfNeeded } from '../actions'

const Move = ({isOwnMove, time, user }) => {
    let moveName;
    let deleteButton;
    
    if (isOwnMove) {
        moveName = (<span>You <span className="glyphicon glyphicon-pencil" /></span>);
    } else {
        moveName = user;
    }

    return (
        <div className={classNames("move", {"own-move": isOwnMove})}>
            <div className="move-time">
                <span>{ moment(time).format('h:mm') }</span>
            </div>
            <div className="move-name">
                <span>
                    {moveName}
                </span>
            </div>
        </div>        
    );
};

const ListItem = ({name, moves, hasOwnMove}) => {
    let moveItems = moves.map((move) => <Move {...move} />);
    let newMove;

    if (!hasOwnMove) {
        newMove = (
            <div className="move move-new">
                <div className="move-icon">
                    <span className="glyphicon glyphicon-plus"></span>
                </div>
                <div className="move-name">
                    <span>Go Here</span>
                </div>
            </div>
        );
    }

    return (
        <div className="row move-row">
            <div className="spot-name col-md-12">
                <span>{name}</span>
            </div>
            <div className="spot-moves col-md-12">
                {moveItems}
                {newMove}
            </div>
        </div>
    );
};

export default class List extends Component {
    componentDidMount () {
        this.props.dispatch(fetchSpotsIfNeeded());
        this.props.dispatch(fetchMovesIfNeeded());
    }
    
    render () {
        if (!this.props.spots) {
            return <div>LOADING</div>
        }
        
        let spotItems = this.props.spots.map((spot) => <ListItem {...spot} />);

        return (
            <div className="container moves-container">
                {spotItems}
            </div>
        );
    }
}

export default List
