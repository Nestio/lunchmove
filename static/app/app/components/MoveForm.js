import React, { Component } from 'react';

class MoveForm extends Component {
    constructor(props){
        super(props)
        this.state = {
            value: ''
        };
        this.onChange = this.onChange.bind(this);
        this.onSubmit = this.onSubmit.bind(this);
    }
    
    onChange(e){

    }
    
    onSubmit(){
        
    }
    
    render(){
        return (
            <form className="form-inline lunch-move-form">
                <div className="lunch-move-form-row">
                    <div className="form-group">
                        <p className="form-control-static">You are eating</p>
                    </div>
                    <div className="form-group">
                        <input className="form-control spot-field" type="text" name="spotName" placeholder="place" />
                        <input type="hidden" name="spot" />
                    </div>
                    <div className="form-group">
                        <p className="form-control-static">at</p>
                    </div>
                    <div className="form-group">
                        <input className="form-control time-field" type="text" name="time" placeholder="time" />
                    </div>
                </div>
                <div className="lunch-move-form-row">
                    <button type="submit" className="btn btn-default" data-saving-text="Saving...">Save</button>
                    <button data-ui="cancel" className="btn btn-default">Cancel</button>
                </div>
            </form>
        )
    }
}

export default MoveForm
