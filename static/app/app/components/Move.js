import React from 'react';
import moment from 'moment';
import classNames from 'classnames';

export default function Move({isOwnMove, time, user }) {
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
