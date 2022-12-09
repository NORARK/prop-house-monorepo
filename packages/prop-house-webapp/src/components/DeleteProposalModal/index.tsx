import React, { Dispatch, SetStateAction } from 'react';
import classes from './DeleteProposalModal.module.css';
import clsx from 'clsx';
import Modal from 'react-modal';
import Button, { ButtonColor } from '../Button';
import Divider from '../Divider';
import { useTranslation } from 'react-i18next';

const DeleteProposalModal: React.FC<{
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
}> = props => {
  const { showModal, setShowModal } = props;
  const { t } = useTranslation();

  function closeModal() {
    setShowModal(false);
  }

  return (
    <Modal isOpen={showModal} onRequestClose={closeModal} className={clsx(classes.modal)}>
      <div className={classes.titleContainer}>
        <p className={classes.modalTitle}>Delete your prop?</p>
        <p className={classes.modalSubtitle}>
          Are you sure you want to delete your proposal? This action cannot be undone.
        </p>
      </div>

      <Divider />

      <div className={classes.buttonContainer}>
        <Button
          text={t('Cancel')}
          bgColor={ButtonColor.White}
          onClick={() => {
            setShowModal(false);
          }}
        />

        <Button
          text={'Delete Prop'}
          bgColor={ButtonColor.Red}
          onClick={() => setShowModal(false)}
        />
      </div>
    </Modal>
  );
};

export default DeleteProposalModal;
