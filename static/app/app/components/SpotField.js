import React, { Component } from 'react';
import Autocomplete from 'react-autocomplete';

export default class SpotField extends Component {
    constructor (props) {
        super(props);
        this.state = {
            value: ''
        };
        this.onChange = this.onChange.bind(this);
        this.onSelect = this.onSelect.bind(this);
    }

    renderItem(item, isHighlighted){
        return (
            <div
                className="tt-suggestion"
                key={item.id}
                id={item.id}
            >
                {item.name}
            </div>
        );
    }
    
    onChange (event, value) {
        this.setState({ value });
    }
    
    onSelect (value) {
        this.setState({ value });
    }
    
    shouldItemRender (item, value) {
        console.log(value);
        if (!value) {
            return false;
        } else {
            return (item.name.toLowerCase().indexOf(value) > -1);
        }
    }
    
    render(){
        return (
            <Autocomplete
                className="spot-field tt-input"
                ref="autocomplete"
                value={this.state.value}
                items={this.props.items}
                getItemValue={(item) => item.name}
                onSelect={this.onSelect}
                onChange={this.onChange}
                renderItem={this.renderItem}
                shouldItemRender={this.shouldItemRender}
            />
        );
    }
}
