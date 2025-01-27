import { useCallback, useEffect, useRef, useState } from 'react';
import classes from './ProposalModal.module.css';
import clsx from 'clsx';
import Modal from 'react-modal';
import { useParams } from 'react-router';
import { useNavigate } from 'react-router-dom';
import { PropHouseWrapper } from '@nouns/prop-house-wrapper';
import { useDispatch } from 'react-redux';
import { StoredProposalWithVotes } from '@nouns/prop-house-wrapper/dist/builders';
import { useAppSelector } from '../../hooks';
import { buildRoundPath } from '../../utils/buildRoundPath';
import { setActiveProposal, setModalActive } from '../../state/slices/propHouse';
import ProposalHeaderAndBody from '../ProposalHeaderAndBody';
import ProposalModalFooter from '../ProposalModalFooter';
import ErrorVotingModal from '../ErrorVotingModal';
import VoteConfirmationModal from '../VoteConfirmationModal';
import SuccessVotingModal from '../SuccessVotingModal';
import refreshActiveProposal, { refreshActiveProposals } from '../../utils/refreshActiveProposal';
import { clearVoteAllotments } from '../../state/slices/voting';
import isWinner from '../../utils/isWinner';
import getWinningIds from '../../utils/getWinningIds';
import VoteAllotmentModal from '../VoteAllotmentModal';
import SaveProposalModal from '../SaveProposalModal';
import DeleteProposalModal from '../DeleteProposalModal';
import { useAccount, useBlockNumber } from 'wagmi';
import { useEthersSigner } from '../../hooks/useEthersSigner';
import { isTimedAuction } from '../../utils/auctionType';
import { signerIsContract } from '../../utils/signerIsContract';
import { submitVotes } from '../../utils/submitVotes';
import { useEthersProvider } from '../../hooks/useEthersProvider';

const ProposalModal = () => {
  const [editProposalMode, setEditProposalMode] = useState(false);

  const params = useParams();
  const { id } = params;
  const navigate = useNavigate();

  const provider = useEthersProvider();
  const signer = useEthersSigner();
  const { address: account } = useAccount();

  const dispatch = useDispatch();
  const community = useAppSelector(state => state.propHouse.activeCommunity);
  const round = useAppSelector(state => state.propHouse.activeRound);
  const activeProposal = useAppSelector(state => state.propHouse.activeProposal);
  const voteAllotments = useAppSelector(state => state.voting.voteAllotments);
  const activeProposals = useAppSelector(state => state.propHouse.activeProposals);
  const infRoundProposals = useAppSelector(state => state.propHouse.infRoundFilteredProposals);
  const proposals = round && isTimedAuction(round) ? activeProposals : infRoundProposals;

  const backendHost = useAppSelector(state => state.configuration.backendHost);
  const backendClient = useRef(new PropHouseWrapper(backendHost, signer));
  const { data: blocknumber } = useBlockNumber({
    chainId: round?.voteStrategy?.chainId ?? 1,
  });

  const [propModalEl, setPropModalEl] = useState<Element | null>();
  const [currentPropIndex, setCurrentPropIndex] = useState<number | undefined>();
  const [isContract, setIsContract] = useState(false);
  const [numPropsVotedFor, setNumPropsVotedFor] = useState(0);

  // modals
  const [showVoteConfirmationModal, setShowVoteConfirmationModal] = useState(false);
  const [showSuccessVotingModal, setShowSuccessVotingModal] = useState(false);
  const [showErrorVotingModal, setShowErrorVotingModal] = useState(false);
  const [showVoteAllotmentModal, setShowVoteAllotmentModal] = useState(false);
  const [showSavePropModal, setShowSavePropModal] = useState(false);
  const [showDeletePropModal, setShowDeletePropModal] = useState(false);

  const [hideScrollButton, setHideScrollButton] = useState(false);
  const winningIds = round && proposals && getWinningIds(proposals, round);

  const handleClosePropModal = () => {
    if (!community || !round) return;
    dispatch(setModalActive(false));
    navigate(buildRoundPath(community, round), { replace: false });
  };

  const dismissModalAndRefreshProps = () => {
    refreshActiveProposals(backendClient.current, round!, dispatch);
    refreshActiveProposal(backendClient.current, activeProposal!, dispatch);
    handleClosePropModal();
  };

  useEffect(() => {
    backendClient.current = new PropHouseWrapper(backendHost, signer);
  }, [signer, backendHost]);

  useEffect(() => {
    if (activeProposal) document.title = `${activeProposal.title}`;
    return () => {
      document.title = `Prop House`;
    };
  }, [activeProposal, dispatch]);

  useEffect(() => {
    if (!proposals || !activeProposal) return;

    const index = proposals.findIndex((p: StoredProposalWithVotes) => p.id === activeProposal.id);
    setCurrentPropIndex(index + 1);
    dispatch(setActiveProposal(proposals[index]));
  }, [proposals, id, dispatch, activeProposal]);

  // eslint-disable-next-line
  useEffect(() => {
    setPropModalEl(document.querySelector('#propModal'));
  });

  const handleKeyPress = useCallback(event => {
    if (event.key === 'ArrowDown') {
      setHideScrollButton(true);
    }
  }, []);

  const handleScroll = useCallback(event => {
    setHideScrollButton(true);
  }, []);

  useEffect(() => {
    if (!propModalEl) return;
    if (propModalEl.scrollTop !== 0 && !hideScrollButton) setHideScrollButton(true);
    propModalEl.addEventListener('scroll', handleScroll, false);
  }, [handleScroll, hideScrollButton, propModalEl]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  const handleDirectionalArrowClick = (direction: 1 | -1) => {
    if (
      !activeProposal ||
      !proposals ||
      proposals.length === 0 ||
      editProposalMode ||
      showDeletePropModal
    )
      return;

    const newPropIndex =
      proposals.findIndex((p: StoredProposalWithVotes) => p.id === activeProposal.id) + direction;
    dispatch(setActiveProposal(proposals[newPropIndex]));
  };

  const handleSubmitVote = async () => {
    if (!activeProposal || !round || !community || !blocknumber) return;
    try {
      setIsContract(
        await signerIsContract(
          signer ? signer : undefined,
          provider,
          account ? account : undefined,
        ),
      );
      await submitVotes(
        voteAllotments,
        Number(blocknumber),
        community,
        backendClient.current,
        isContract,
      );

      setShowErrorVotingModal(false);
      setNumPropsVotedFor(voteAllotments.length);
      setShowSuccessVotingModal(true);
      refreshActiveProposals(backendClient.current, round, dispatch);
      refreshActiveProposal(backendClient.current, activeProposal, dispatch);
      dispatch(clearVoteAllotments());
      setShowVoteConfirmationModal(false);
    } catch (e) {
      console.log(e);
      setShowErrorVotingModal(true);
    }
  };

  return (
    <>
      {showVoteConfirmationModal && round && (
        <VoteConfirmationModal
          setShowVoteConfirmationModal={setShowVoteConfirmationModal}
          submitVote={handleSubmitVote}
        />
      )}

      {showSuccessVotingModal && (
        <SuccessVotingModal
          setShowSuccessVotingModal={setShowSuccessVotingModal}
          numPropsVotedFor={numPropsVotedFor}
          signerIsContract={isContract}
        />
      )}

      {showErrorVotingModal && (
        <ErrorVotingModal setShowErrorVotingModal={setShowErrorVotingModal} />
      )}

      {showVoteAllotmentModal && activeProposal && (
        <VoteAllotmentModal propId={activeProposal.id} setShowModal={setShowVoteAllotmentModal} />
      )}

      {showSavePropModal && activeProposal && round && (
        <SaveProposalModal
          propId={activeProposal.id}
          roundId={round.id}
          setShowSavePropModal={setShowSavePropModal}
          setEditProposalMode={setEditProposalMode}
          dismissModalAndRefreshProps={dismissModalAndRefreshProps}
          handleClosePropModal={handleClosePropModal}
        />
      )}

      {showDeletePropModal && activeProposal && (
        <DeleteProposalModal
          id={activeProposal.id}
          setShowDeletePropModal={setShowDeletePropModal}
          dismissModalAndRefreshProps={dismissModalAndRefreshProps}
          handleClosePropModal={handleClosePropModal}
        />
      )}

      <Modal
        isOpen={true}
        onRequestClose={() => {
          setEditProposalMode(false);
          handleClosePropModal();
        }}
        className={clsx(classes.modal, 'proposalModalContainer')}
        id="propModal"
      >
        {activeProposal && proposals && proposals.length > 0 && currentPropIndex && (
          <>
            <ProposalHeaderAndBody
              currentProposal={activeProposal}
              currentPropIndex={currentPropIndex}
              handleDirectionalArrowClick={handleDirectionalArrowClick}
              handleClosePropModal={handleClosePropModal}
              hideScrollButton={hideScrollButton}
              setHideScrollButton={setHideScrollButton}
              showVoteAllotmentModal={showVoteAllotmentModal}
              editProposalMode={editProposalMode}
              setEditProposalMode={setEditProposalMode}
              proposals={proposals}
            />

            <ProposalModalFooter
              setShowVotingModal={setShowVoteConfirmationModal}
              showVoteAllotmentModal={showVoteAllotmentModal}
              setShowVoteAllotmentModal={setShowVoteAllotmentModal}
              propIndex={currentPropIndex}
              numberOfProps={proposals.length}
              handleDirectionalArrowClick={handleDirectionalArrowClick}
              isWinner={winningIds && isWinner(winningIds, activeProposal.id)}
              editProposalMode={editProposalMode}
              setEditProposalMode={setEditProposalMode}
              setShowSavePropModal={setShowSavePropModal}
              setShowDeletePropModal={setShowDeletePropModal}
            />
          </>
        )}
      </Modal>
    </>
  );
};

export default ProposalModal;
