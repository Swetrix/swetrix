import React from 'react'
import BM from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'

const Modal = ({ title, text, onSubmit, onCancel, cancelText = 'Close', submitText = 'Save changes' }) => (
  <BM show={true} onHide={onCancel}>
    <BM.Header closeButton>
      <BM.Title>{title}</BM.Title>
    </BM.Header>
    <BM.Body>{text}</BM.Body>
    <BM.Footer>
      <Button variant="secondary" onClick={onCancel}>
        {cancelText}
      </Button>
      <Button variant="primary" onClick={onSubmit}>
        {submitText}
      </Button>
    </BM.Footer>
  </BM>
)

export default Modal