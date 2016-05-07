import React, { Component } from 'react';

let MoveTime = {
    encode: function(val) {
        let wordMap = {
            'rightnow': 1,
            'immediately': 1,
            'now': 1,
            'soonish': 15,
            'soon': 15,
            'later': 60
        };

        let stringVal = wordMap[val.replace(/\W+/g, '').toLowerCase()];

        if (stringVal) {
            return moment().add(stringVal, 'm').format();
        }

        let numVal = val.replace(/([^:0-9])/g, '');

        if (!numVal || !numVal.match(/\d{1,2}:\d{2}/)){ return ''; }

        let split = numVal.split(':').map(function(num){return +num; });
        if (split[0] < 6) {
            split[0] += 12;
        }

        return moment(split.join(':'), 'hh:mm').format();
    },
    decode: function(val) {
        return val ? moment(val).format('h:mm') : '';
    }
};

class MoveForm extends Component {
    constructor(props){
        super(props)
        this.onChange = this.onChange.bind(this);
        this.onSubmit = this.onSubmit.bind(this);
    }
    
    onChange(e){

    }
    
    onSubmit(){
        
    }
    
    render(){
        if (!this.props.spots.items) {
            return <div>LOADING</div>;
        }
        
        let options = this.props.spots.items.map((choice) => {
            return <option value={choice.id}>{choice.name}</option>
        });
        
        return (
            <form className="form-inline lunch-move-form">
                <div className="lunch-move-form-row">
                    <div className="form-group">
                        <p className="form-control-static">You are eating</p>
                    </div>
                    <div className="form-group">
                        <select className="form-control spot-field" name="spot">
                            <option value={null}></option>
                            {options}
                        </select>
                    </div>
                    <div className="form-group">
                        <p className="form-control-static">at</p>
                    </div>
                    <div className="form-group">
                        <input className="form-control time-field" type="text" name="time"/>
                    </div>
                </div>
                <div className="lunch-move-form-row">
                    <button type="submit" className="btn btn-default">Save</button>
                    <button className="btn btn-default">Cancel</button>
                </div>
            </form>
        )
    }
}

export default MoveForm
