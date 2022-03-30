import { Col, Row, Image } from 'react-bootstrap';
import Button, { ButtonColor } from '../Button';
import classes from './HomeHeader.module.css';
import { Link } from 'react-router-dom';
import grempBulb from '../../assets/gremp-lightbulb.png';
import { useAppSelector } from '../../hooks';
import defaultBrowseToAuctionId from '../../utils/defaultBrowseToAuctionId';

const HomeHeader = () => {
  const browseToAuctionId = useAppSelector((state) =>
    defaultBrowseToAuctionId(state.propHouse.auctions)
  );
  return (
    <Row className={classes.wrapper}>
      <Col xl={6} className={classes.leftCol}>
        <div className={classes.poweredByNouns}>
          Powered by{' '}
          <a href="https://nouns.wtf" target="_blank" rel="noreferrer">
            Nouns
          </a>
        </div>
        <h1>Weekly funding for your ideas</h1>
        <p>
          Bring your ideas to life by submitting a proposal to <b>Nouns DAO</b>.
          Funding rounds are held regularly and are available to anyone,
          anywhere.
        </p>
        <div className={classes.btnsContainer}>
          <Col xs={6} md="auto">
            <Link to="/learn">
              <Button text="Learn more" bgColor={ButtonColor.Pink} />
            </Link>
          </Col>
          <Col xs={6} md="auto">
            <Link to={`/auction/${browseToAuctionId}`}>
              <Button text="Browse rounds" bgColor={ButtonColor.White} />
            </Link>
          </Col>
        </div>
      </Col>
      <Col xl={{ span: 4, offset: 2 }} className={classes.rightCol}>
        <Image src={grempBulb} fluid />
      </Col>
    </Row>
  );
};

export default HomeHeader;