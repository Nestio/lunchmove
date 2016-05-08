import React, { Component } from 'react';
import {reduxForm} from 'redux-form';
import moment from 'moment';
import classNames from 'classnames';
import { Link, browserHistory } from 'react-router';


import Loading from './Loading';
import { parseTimeInput } from '../utils';

const fields = [
    'spot',
    'time'
];

const validate = values => {
  const errors = {}
  if (!values.spot) {
    errors.spot = 'Required';
  }
  
  if (!values.time){
    errors.time = 'Required';
  } else if (!parseTimeInput(values.time)) {
    errors.time = 'Enter time in HH:MM format';
  }
  return errors;
}

class MoveForm extends Component {
    constructor(props){
      super(props)
      this.onSubmit = this.onSubmit.bind(this);
    }
    
    onSubmit(data){
      let parsed = parseTimeInput(data.time);
      data.time = moment(parsed, 'hh:mm').format();
      this.props.updateMove(data);
      return this.props.saveMove();
    }
    
    componentWillReceiveProps(nextProps){
        if (this.props.submitting && !nextProps.submitting) {
            browserHistory.push('/');
        }
    }
    
    render(){
        if (!this.props.spots.items) {
            return <Loading />;
        }
        
        let options = this.props.spots.items.map((choice) => {
            return <option key={choice.id} value={choice.id}>{choice.name}</option>
        });
                
        let {fields: {spot, time}, handleSubmit, submitting} = this.props;
        let hasErrors = !!(spot.error || time.error);
        return (
            <form className="form-inline lunch-move-form" onSubmit={handleSubmit(this.onSubmit)}>
                <div className="lunch-move-form-row">
                    <div className="form-group">
                        <p className="form-control-static">You are eating</p>
                    </div>
                    <div className="form-group">
                        <select className="form-control spot-field" name="spot" {...spot}>
                            <option value={null}></option>
                            {options}
                        </select>
                    </div>
                    <div className="form-group">
                        <p className="form-control-static">at</p>
                    </div>
                    <div className="form-group">
                        <input className="form-control time-field" type="text" name="time" {...time}/>
                    </div>
                </div>
                <div className="lunch-move-form-row">
                    <button type="submit" className="btn btn-default" disabled={hasErrors || submitting}>
                      { submitting ? 'Saving...' : 'Save' }
                    </button>
                    <Link to="/" className="btn btn-default">Cancel</Link>
                </div>
            </form>
        )
    }
}

MoveForm = reduxForm({
  form: 'move-form',
  fields: fields,
  validate
}, state => {
  let { time, spot } = state.recentMove;
  time = (time ? moment(time).format('h:mm') : '');
  return { initialValues: { time, spot } };
})(MoveForm);

export default MoveForm;
