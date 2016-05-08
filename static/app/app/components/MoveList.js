import React, { Component } from 'react';

import MoveListRow from './MoveListRow';
import Loading from './Loading';

export default class List extends Component {
    componentDidMount () {
        this.props.fetchSpotsIfNeeded();
        this.props.fetchMovesIfNeeded();
    }
    
    render () {
        if (!this.props.spots) {
            return <Loading />;
        }
        
        let list;
        if (!this.props.spots.length) {
            list = (
                <div className="col-md-12 text-center">
                    {"No one's going anywhere, just quite yet."}
                </div>
            );

        } else {
            list = this.props.spots.map((spot, i) => <MoveListRow {...spot} key={i}/>);
        }
        
        let yourMove;
        if (!this.props.recentMove.id) {
            yourMove = (
                <div className="container your-move">
                    <div className="row">
                        <div className="col-sm-12 text-center">
                            <button type="button" className="btn btn-default btn-lg">Where are you going?</button>
                        </div>
                    </div>
                </div>
            )
        }
        
        return (
            <div>
                <div className="lunch-moves-list">
                    <div className="container moves-container">
                        {list}
                    </div>
                </div>
                {yourMove}
            </div>
        )
    }
}
