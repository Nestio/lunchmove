import React, { Component } from 'react';
import { Typeahead } from 'react-typeahead';

export default class SpotField extends Component {
    constructor (props) {
        super(props);
        this.state = {
            value: ''
        };
    }
    
    render(){
        return (
            <Typeahead
                options={this.props.items}
                maxVisible={3}
                displayOption="name"
                filterOption="name"
                customClasses={{
                    input: "spot-field form-control"
                }}
            />
        );
    }
}
