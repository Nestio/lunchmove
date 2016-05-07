import React, { Component } from 'react';
import {reduxForm} from 'redux-form';

const fields = [
    'user'
];

class NameForm extends Component {    
    render () {
        return (
            <form className="form-inline lunch-move-form" onSubmit={this.props.handleSubmit(this.props.updateMove)}>
                <div className="lunch-move-form-row">
                    <div className="form-group">
                        <p className="form-control-static">Your name is</p>
                    </div>
                    <div className="form-group">
                        <input className="form-control" type="text" name="user" {...this.props.fields.user} />
                    </div>
                </div>
                <div className="lunch-move-form-row">
                    <button type="submit" className="btn btn-default" >Save</button>
                    <button data-ui="cancel" className="btn btn-default">Cancel</button>
                </div>
            </form>
        );
    }
};

NameForm = reduxForm({
  form: 'name-form',
  fields: fields
})(NameForm);

export default NameForm
