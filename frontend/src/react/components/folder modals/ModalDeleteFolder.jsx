import React, { Component } from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import PropTypes from 'prop-types';


export default class ModalDeleteFolder extends Component {
  render() {
    return (
      <div className="d-inline">
        <Modal isOpen={this.props.isOpenDelete} toggle={this.toggle}>
          <ModalHeader toggle={this.props.toggleDeleteModal}>Delete Folder</ModalHeader>
          <ModalBody>
            Are you sure you want to delete folder <b>{this.props.deleteFolderName}</b>?
          </ModalBody>
          <ModalFooter>
            <Button className="btn btn-danger" onClick={this.props.deleteFolder}>Delete</Button>
            <Button color="secondary" onClick={this.props.toggleDeleteModal}>Cancel</Button>
          </ModalFooter>
        </Modal>
      </div>
    );
  }
}
ModalDeleteFolder.propTypes = {
  isOpenDelete: PropTypes.bool.isRequired,
  deleteFolderName: PropTypes.string.isRequired,
  toggleDeleteModal: PropTypes.func.isRequired,
  deleteFolder: PropTypes.func.isRequired,
};
