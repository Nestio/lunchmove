import React, { Component } from 'react';

class NameForm extends Component {
    constructor(props){
        super(props)
        this.state = {
            value: ''
        };
        this.onChange = this.onChange.bind(this);
        this.onSubmit = this.onSubmit.bind(this);
    }
    
    onChange(e){
        this.setState({
            value: e.target.value
        });
    }
    
    onSubmit(e){
        e.preventDefault();
        this.props.updateMove({
            user: this.state.value
        });
    }
    
    render () {
        return (
            <form className="form-inline lunch-move-form" onSubmit={this.onSubmit}>
                <div className="lunch-move-form-row">
                    <div className="form-group">
                        <p className="form-control-static">Your name is</p>
                    </div>
                    <div className="form-group">
                        <input className="form-control" type="text" name="user" onChange={this.onChange}/>
                    </div>
                </div>
                <div className="lunch-move-form-row">
                    <button type="submit" className="btn btn-default" disabled={!this.state.value}>Save</button>
                    <button data-ui="cancel" className="btn btn-default">Cancel</button>
                </div>
            </form>
        );
    }
};

export default NameForm
