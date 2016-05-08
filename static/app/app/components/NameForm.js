import React, { Component } from 'react';
import {reduxForm} from 'redux-form';

const fields = [
    'user'
];

const validate = (values) => {
  const errors = {};
    if (!values.user) {
        errors.user = 'Required';
    }
    return errors;
}

class NameForm extends Component {
    render () {
        const { fields: { user }, handleSubmit, updateMove } = this.props;
        const hasErrors = !!user.error;
        return (
            <form className="form-inline lunch-move-form" onSubmit={handleSubmit(updateMove)}>
                <div className="lunch-move-form-row">
                    <div className="form-group">
                        <p className="form-control-static">Your name is</p>
                    </div>
                    <div className="form-group">
                        <input className="form-control" type="text" name="user" {...user} />
                    </div>
                </div>
                <div className="lunch-move-form-row">
                    <button type="submit" className="btn btn-default" disabled={hasErrors}>Save</button>
                    <button className="btn btn-default">Cancel</button>
                </div>
            </form>
        );
    }
};

NameForm = reduxForm({
  form: 'name-form',
  fields: fields,
  validate
}, state => ({
    initialValues: state.recentMove
}))(NameForm);

export default NameForm
