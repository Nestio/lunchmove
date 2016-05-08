import React from 'react';
import moment from 'moment';
import classNames from 'classnames';
import { browserHistory } from 'react-router'

export default function Move({isOwnMove, time, user }) {
    let moveName;
    let deleteButton;
    let onClick;
    
    if (isOwnMove) {
        moveName = (<span>You <span className="glyphicon glyphicon-pencil" /></span>);
        onClick = () => browserHistory.push('/edit'); 
    } else {
        moveName = user;
    }
    

    return (
        <div className={classNames("move", {"own-move": isOwnMove})} onClick={onClick}>
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
