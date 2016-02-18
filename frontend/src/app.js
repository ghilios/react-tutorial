import './main.css'

import React from 'react';
import ReactDOM from 'react-dom';
import client from './client';
import follow from './follow';
import when from 'when';
import stompClient from './websocket-listener';

const root = '/api';

export default class App extends React.Component {

    constructor(props) {
        super(props);
        this.state = {employees: [], attributes: [], pageSize: 2, links: {}};
        this.updatePageSize = this.updatePageSize.bind(this);
        this.onNavigate = this.onNavigate.bind(this);
        this.onCreate = this.onCreate.bind(this);
        this.onUpdate = this.onUpdate.bind(this);
        this.onDelete = this.onDelete.bind(this);
        this.updatePageSize = this.updatePageSize.bind(this);
        this.refreshAndGoToLastPage = this.refreshAndGoToLastPage.bind(this);
        this.refreshCurrentPage = this.refreshCurrentPage.bind(this);
    }

    componentDidMount() {
        this.loadFromServer(this.state.pageSize);
        stompClient.register([
            {route: '/topic/newEmployee', callback: this.refreshAndGoToLastPage},
            {route: '/topic/updateEmployee', callback: this.refreshCurrentPage},
            {route: '/topic/deleteEmployee', callback: this.refreshCurrentPage}
        ]);
    }

    loadFromServer(pageSize) {
        follow(client, root, [
                {rel: 'employees', params: {size: pageSize}}
            ]).then(employeeCollection => {
                return client({
                    method: 'GET',
                    path: employeeCollection.entity._links.profile.href,
                    headers: {'Accept': 'application/schema+json'}
                }).then(schema => {
                    this.schema = schema.entity;
                    this.links = employeeCollection.entity._links;
                    return employeeCollection;
                });
            }).then(employeeCollection => {
                return employeeCollection.entity._embedded.employees.map(employee =>
                    client({
                        method: 'GET',
                        path: employee._links.self.href,
                        noCache: true
                    }));
            }).then(employeePromises => {
                return when.all(employeePromises);
            }).done(employees => {
                this.setState({
                    employees: employees,
                    attributes: Object.keys(this.schema.properties),
                    pageSize: pageSize,
                    links: this.links});
            });
    }

    onCreate(newEmployee) {
        follow(client, root, ['employees']).then(employeeCollection => {
            return client({
                method: 'POST',
                path: employeeCollection.entity._links.self.href,
                entity: newEmployee,
                headers: {'Content-Type': 'application/json'}
            })
        });
    }

    onUpdate(employee, updatedEmployee) {
        client({
            method: 'PUT',
            path: employee.entity._links.self.href,
            entity: updatedEmployee,
            headers: {
                'Content-Type': 'application/json',
                'If-Match': employee.headers.Etag
            }
        });
    }

    onDelete(employee) {
        client({method: 'DELETE', path: employee._links.self.href});
    }

    onNavigate(navUri) {
        client({
            method: 'GET',
            path: navUri
        }).then(employeeCollection => {
            this.links = employeeCollection.entity._links;
            this.page = employeeCollection.entity.page;

            return employeeCollection.entity._embedded.employees.map(employee =>
                    client({
                        method: 'GET',
                        path: employee._links.self.href
                    })
            );
        }).then(employeePromises => {
            return when.all(employeePromises);
        }).done(employees => {
            this.setState({
                page: this.page,
                employees: employees,
                attributes: Object.keys(this.schema.properties),
                pageSize: this.state.pageSize,
                links: this.links
            });
        });
    }

    updatePageSize(pageSize) {
        if (pageSize !== this.state.pageSize) {
            // TODO: Update to preserve the page number? Just as an experiment
            this.loadFromServer(pageSize);
        }
    }

    refreshAndGoToLastPage(message) {
        follow(client, root, [{
            rel: 'employees',
            params: {size: this.state.pageSize}
        }]).done(response => {
            const href = response.entity._links.last ? response.entity._links.last.href : response.entity._links.self.href;
            this.onNavigate(href);
        })
    }

    refreshCurrentPage(message) {
        follow(client, root, [{
            rel: 'employees',
            params: {
                size: this.state.pageSize,
                page: this.state.page.number
            }
        }]).then(employeeCollection => {
            this.links = employeeCollection.entity._links;
            this.page = employeeCollection.entity.page;

            return employeeCollection.entity._embedded.employees.map(employee => {
                return client({
                    method: 'GET',
                    path: employee._links.self.href
                })
            });
        }).then(employeePromises => {
            return when.all(employeePromises);
        }).then(employees => {
            this.setState({
                page: this.page,
                employees: employees,
                attributes: Object.keys(this.schema.properties),
                pageSize: this.state.pageSize,
                links: this.links
            });
        });
    }

    render() {
        return <div>
            <CreateDialog attributes={this.state.attributes} onCreate={this.onCreate}/>
            <EmployeeList employees={this.state.employees}
                          links={this.state.links}
                          pageSize={this.state.pageSize}
                          onNavigate={this.onNavigate}
                          attributes={this.state.attributes}
                          onUpdate={this.onUpdate}
                          onDelete={this.onDelete}
                          updatePageSize={this.updatePageSize}/>
        </div>;
    }
}

class EmployeeList extends React.Component{
    constructor(props) {
        super(props);
        this.handleNavFirst = this.handleNavFirst.bind(this);
        this.handleNavPrev = this.handleNavPrev.bind(this);
        this.handleNavNext = this.handleNavNext.bind(this);
        this.handleNavLast = this.handleNavLast.bind(this);
        this.handleInput = this.handleInput.bind(this);
    }

    handleNavFirst(e){
        e.preventDefault();
        this.props.onNavigate(this.props.links.first.href);
    }

    handleNavPrev(e) {
        e.preventDefault();
        this.props.onNavigate(this.props.links.prev.href);
    }

    handleNavNext(e) {
        e.preventDefault();
        this.props.onNavigate(this.props.links.next.href);
    }

    handleNavLast(e) {
        e.preventDefault();
        this.props.onNavigate(this.props.links.last.href);
    }

    handleInput(e) {
        e.preventDefault();
        var pageSize = ReactDOM.findDOMNode(this.refs.pageSize).value;
        if (/^[0-9]+$/.test(pageSize)) {
            this.props.updatePageSize(pageSize);
        } else {
            ReactDOM.findDOMNode(this.refs.pageSize).value =
                pageSize.substring(0, pageSize.length - 1);
        }
    }

    render() {
        var employees = this.props.employees.map(employee =>
                <Employee key={employee.entity._links.self.href}
                          employee={employee}
                          attributes={this.props.attributes}
                          onUpdate={this.props.onUpdate}
                          onDelete={this.props.onDelete}/>
        );

        var navLinks = [];
        if ("first" in this.props.links) {
            navLinks.push(<button key="first" onClick={this.handleNavFirst}>&lt;&lt;</button>);
        }
        if ("prev" in this.props.links) {
            navLinks.push(<button key="prev" onClick={this.handleNavPrev}>&lt;</button>);
        }
        if ("next" in this.props.links) {
            navLinks.push(<button key="next" onClick={this.handleNavNext}>&gt;</button>);
        }
        if ("last" in this.props.links) {
            navLinks.push(<button key="last" onClick={this.handleNavLast}>&gt;&gt;</button>);
        }

        return (
            <div>
                <input ref="pageSize" defaultValue={this.props.pageSize} onInput={this.handleInput}/>
                <table>
                    <tbody>
                        <tr>
                            <th>First Name</th>
                            <th>Last Name</th>
                            <th>Description</th>
                            <th></th>
                        </tr>
                        {employees}
                    </tbody>
                </table>
                <div>
                    {navLinks}
                </div>
            </div>
        )
    }
}

class Employee extends React.Component{
    constructor(props) {
        super(props);
        this.handleDelete = this.handleDelete.bind(this);
    }

    handleDelete() {
        this.props.onDelete(this.props.employee);
    }

    render() {
        return (
                <tr>
                    <td>{this.props.employee.entity.firstName}</td>
                    <td>{this.props.employee.entity.lastName}</td>
                    <td>{this.props.employee.entity.description}</td>
                    <td>
                        <UpdateDialog employee={this.props.employee}
                                      attributes={this.props.attributes}
                                      onUpdate={this.props.onUpdate}/>
                    </td>
                    <td>
                        <button onClick={this.handleDelete}>Delete</button>
                    </td>
                </tr>
        )
    }
}

class CreateDialog extends React.Component {

    constructor(props) {
        super(props);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleSubmit(e) {
        e.preventDefault();
        var newEmployee = {};
        this.props.attributes.forEach(attribute => {
            newEmployee[attribute] = ReactDOM.findDOMNode(this.refs[attribute]).value.trim();
        });
        this.props.onCreate(newEmployee);

        // clear out the dialog's inputs
        this.props.attributes.forEach(attribute => {
            ReactDOM.findDOMNode(this.refs[attribute]).value = '';
        });

        // Navigate away from the dialog to hide it.
        window.location = "#";
    }

    render() {
        var inputs = this.props.attributes.map(attribute =>
                <p key={attribute}>
                    <input type="text" placeholder={attribute} ref={attribute} className="field" />
                </p>
        );

        return (<div>
                <a href="#createEmployee">Create</a>

                <div id="createEmployee" className="modalDialog">
                    <div>
                        <a href="#" title="Close" className="close">X</a>

                        <h2>Create new employee WHA</h2>

                        <form>
                            {inputs}
                            <button onClick={this.handleSubmit}>Create</button>
                        </form>
                    </div>
                </div>
            </div>
        )
    }
}

class UpdateDialog extends React.Component {

    constructor(props) {
        super(props);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleSubmit(e) {
        e.preventDefault();
        var updatedEmployee = {};
        this.props.attributes.forEach(attribute => {
            updatedEmployee[attribute] = ReactDOM.findDOMNode(this.refs[attribute]).value.trim();
        });
        this.props.onUpdate(this.props.employee, updatedEmployee);
        window.location = "#";
    }

    render() {
        var inputs = this.props.attributes.map(attribute =>
                // NOTE: Issue here with key usage. This dies horrifically if multiple fields have the same value.
                // Production usage should go to extra lengths to ensure uniqueness, for instance including the attribute itself
                <p key={this.props.employee.entity[attribute]}>
                    <input type="text" placeholder={attribute}
                           defaultValue={this.props.employee.entity[attribute]}
                           ref={attribute} className="field" />
                </p>
        );

        var dialogId = "updateEmployee-" + this.props.employee.entity._links.self.href;

        return (
            <div key={this.props.employee.entity._links.self.href}>
                <a href={"#" + dialogId}>Update</a>
                <div id={dialogId} className="modalDialog">
                    <div>
                        <a href="#" title="Close" className="close">X</a>

                        <h2>Update an employee</h2>

                        <form>
                            {inputs}
                            <button onClick={this.handleSubmit}>Update</button>
                        </form>
                    </div>
                </div>
            </div>
        )
    }

};