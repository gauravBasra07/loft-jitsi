import React from 'react';
import { connect } from 'react-redux';

import { isMobileBrowser } from '../../base/environment/utils';
import { translate, translateToHTML } from '../../base/i18n/functions';
import Icon from '../../base/icons/components/Icon';
import { IconWarning } from '../../base/icons/svg';
import Watermarks from '../../base/react/components/web/Watermarks';
import getUnsafeRoomText from '../../base/util/getUnsafeRoomText.web';
import CalendarList from '../../calendar-sync/components/CalendarList.web';
import RecentList from '../../recent-list/components/RecentList.web';
import SettingsButton from '../../settings/components/web/SettingsButton';
import { SETTINGS_TABS } from '../../settings/constants';
import { toast } from "react-toastify";


import { AbstractWelcomePage, IProps, _mapStateToProps } from './AbstractWelcomePage';
import Tabs from './Tabs';
import { toState } from '../../base/redux/functions';
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from 'yup';
import sign from 'jwt-encode';
// import verify from 'jwt-decode'
import Webcam from "react-webcam";
import { AxiosApiHitter } from "../../modules"
import { Config } from "../../../ThirdPartyConfig";
const verify = require("jwt-decode");
/**
 * The pattern used to validate room name.
 *
 * @type {string}
 */
export const ROOM_NAME_VALIDATE_PATTERN_STR = '^[^?&:\u0022\u0027%#]+$';

/**
 * The Web container rendering the welcome page.
 *
 * @augments AbstractWelcomePage
 */
class WelcomePage extends AbstractWelcomePage<IProps> {
    _additionalContentRef: HTMLDivElement | null;
    _additionalToolbarContentRef: HTMLDivElement | null;
    _additionalCardRef: HTMLDivElement | null;
    _roomInputRef: HTMLInputElement | null;
    _additionalCardTemplate: HTMLTemplateElement | null;
    _additionalContentTemplate: HTMLTemplateElement | null;
    _additionalToolbarContentTemplate: HTMLTemplateElement | null;

    /**
     * Default values for {@code WelcomePage} component's properties.
     *
     * @static
     */
    static defaultProps = {
        _room: ''
    };

    /**
     * Initializes a new WelcomePage instance.
     *
     * @param {Object} props - The read-only properties with which the new
     * instance is to be initialized.
     */
    constructor(props: IProps) {
        super(props);

        this.state = {
            ...this.state,
            generateRoomNames:
                interfaceConfig.GENERATE_ROOMNAMES_ON_WELCOME_PAGE
        };

        /**
         * The HTML Element used as the container for additional content. Used
         * for directly appending the additional content template to the dom.
         *
         * @private
         * @type {HTMLTemplateElement|null}
         */
        this._additionalContentRef = null;

        this._roomInputRef = null;

        /**
         * The HTML Element used as the container for additional toolbar content. Used
         * for directly appending the additional content template to the dom.
         *
         * @private
         * @type {HTMLTemplateElement|null}
         */
        this._additionalToolbarContentRef = null;

        this._additionalCardRef = null;

        /**
         * The template to use as the additional card displayed near the main one.
         *
         * @private
         * @type {HTMLTemplateElement|null}
         */
        this._additionalCardTemplate = document.getElementById(
            'welcome-page-additional-card-template') as HTMLTemplateElement;

        /**
         * The template to use as the main content for the welcome page. If
         * not found then only the welcome page head will display.
         *
         * @private
         * @type {HTMLTemplateElement|null}
         */
        this._additionalContentTemplate = document.getElementById(
            'welcome-page-additional-content-template') as HTMLTemplateElement;

        /**
         * The template to use as the additional content for the welcome page header toolbar.
         * If not found then only the settings icon will be displayed.
         *
         * @private
         * @type {HTMLTemplateElement|null}
         */
        this._additionalToolbarContentTemplate = document.getElementById(
            'settings-toolbar-additional-content-template'
        ) as HTMLTemplateElement;

        // Bind event handlers so they are only bound once per instance.
        this._onFormSubmit = this._onFormSubmit.bind(this);
        this._onRoomChange = this._onRoomChange.bind(this);
        this._setAdditionalCardRef = this._setAdditionalCardRef.bind(this);
        this._setAdditionalContentRef
            = this._setAdditionalContentRef.bind(this);
        this._setRoomInputRef = this._setRoomInputRef.bind(this);
        this._setAdditionalToolbarContentRef
            = this._setAdditionalToolbarContentRef.bind(this);
        this._renderFooter = this._renderFooter.bind(this);
    }

    /**
     * Implements React's {@link Component#componentDidMount()}. Invoked
     * immediately after this component is mounted.
     *
     * @inheritdoc
     * @returns {void}
     */
    componentDidMount() {
        super.componentDidMount();

        document.body.classList.add('welcome-page');
        document.title = interfaceConfig.APP_NAME;

        const queryString = window.location.search;

        const urlParams = new URLSearchParams(queryString);

        const entryJWT = urlParams.get("entryT");
        const mId = urlParams.get("mid");

        if (entryJWT) {
            try {
                const decodedObj = verify(entryJWT, Config.ENTRY_TOKEN_SECRET_KEY);
                this.setState({
                    meetingId: decodedObj?.meetingId || "",
                    emailId: decodedObj?.emailId || "",
                    displayName: decodedObj?.userName || "",
                    userType: decodedObj?.role === "host" ? "host" : "participant",
                })
            }
            catch (err: any) {
                toast.error(err.message);
                window.location.replace("/");
            }
        }
        else if (mId) {
            this.setState({ meetingId: mId || "" });
        }

        if (this.state.generateRoomNames) {
            this._updateRoomName();
        }

        if (this._shouldShowAdditionalContent()) {
            this._additionalContentRef?.appendChild(
                this._additionalContentTemplate?.content.cloneNode(true) as Node);
        }

        if (this._shouldShowAdditionalToolbarContent()) {
            this._additionalToolbarContentRef?.appendChild(
                this._additionalToolbarContentTemplate?.content.cloneNode(true) as Node
            );
        }

        if (this._shouldShowAdditionalCard()) {
            this._additionalCardRef?.appendChild(
                this._additionalCardTemplate?.content.cloneNode(true) as Node
            );
        }

    }

    /**
     * Removes the classname used for custom styling of the welcome page.
     *
     * @inheritdoc
     * @returns {void}
     */
    componentWillUnmount() {
        super.componentWillUnmount();

        document.body.classList.remove('welcome-page');
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement|null}
     */
    render() {
        const { _moderatedRoomServiceUrl, t } = this.props;
        const { DEFAULT_WELCOME_PAGE_LOGO_URL, DISPLAY_WELCOME_FOOTER } = interfaceConfig;
        const showAdditionalCard = this._shouldShowAdditionalCard();
        const showAdditionalContent = this._shouldShowAdditionalContent();
        const showAdditionalToolbarContent = this._shouldShowAdditionalToolbarContent();
        const contentClassName = showAdditionalContent ? 'with-content' : 'without-content';
        const footerClassName = DISPLAY_WELCOME_FOOTER ? 'with-footer' : 'without-footer';

        return (
            <Formik initialValues={{
                meetingId: this.state.meetingId,
                emailId: this.state.emailId,
                displayName: this.state.displayName,
            }} validationSchema={Yup.object({
                meetingId: Yup.string().required("Meeting Id is required").trim().typeError("Invalid Meeting Id").min(3, "Too short")
                    .max(30, "Too long"),
                emailId: Yup.string().matches(/^[a-zA-Z0-9\.+]+[@][a-z]+[\.][a-z]{3}$/, "Invalid Email").trim().typeError("Invalid Email Id").required("Email Id is required"),
                displayName: Yup.string().required("Name is required").trim().matches(/^[a-zA-Z0-9-~ ]+$/, "Invalid Title").typeError("Invalid Meeting Id").min(3, "Too short")
                    .max(20, "Too long"),
            })}
                enableReinitialize={true}
                onSubmit={values => {
                    const queryString = window.location.search;

                    const urlParams = new URLSearchParams(queryString);

                    const entryJWT = urlParams.get("entryT");
                    this._initMeeting({ ...values, entryJWT: entryJWT || "" });
                }}
            >
                {
                    props => (
                        <div
                            className={`welcome ${contentClassName} ${footerClassName}`}
                            id='welcome_page'>
                            <section className="join-meeting-sec">
                                <div className="container">
                                    <div className="onship-logo">
                                        <img src="images/vikrant-logo.png" alt="" />
                                    </div>
                                    <div className="join-meeting-wrapper">
                                        <h1>Reliable video conferencing</h1>
                                        <p>even on satellite internet below 256kbps</p>
                                        <div className="join-meeting-box">
                                            <div className="join-meeting-img-img-box">
                                                <div className="join-meeting-img">
                                                    {/* <img src="images/woman-with-headset-video-call 1.png" alt="" /> */}
                                                    {/* <input accept="image/*" capture="environment"/> */}
                                                    {
                                                        this.state.cameraShow ? <Webcam audio={this.state.micShow} /> :
                                                            <div className="cameraOff-black" />
                                                    }

                                                </div>
                                                <div className="aud-vid-box">
                                                    {/* Mic button */}
                                                    <a className={`audio-vid-btn ${this.state.micShow == false ? "active" : ''}`} onClick={() => this.setState({ micShow: !this.state.micShow })}>
                                                        {
                                                            this.state.micShow ? <svg xmlns="http://www.w3.org/2000/svg" width="18" height="20" viewBox="0 0 18 29" fill="none">
                                                                <path fillRule="evenodd" clipRule="evenodd" d="M8.6112 0.981934C5.6826 0.981934 3.3085 3.35604 3.3085 6.28464V15.3861C3.3085 18.3147 5.6826 20.6888 8.6112 20.6888C9.26044 20.6888 9.88243 20.5722 10.4573 20.3586C10.8565 20.2143 11.2377 20.0216 11.5877 19.781C12.4637 19.1793 13.1278 18.3563 13.5331 17.3742C13.6202 17.1628 13.6888 16.9472 13.7426 16.7284C13.8445 16.3376 13.903 15.9292 13.9125 15.5088C13.9388 15.0382 13.9311 14.5627 13.9236 14.0918L13.9236 14.0917C13.9201 13.871 13.9166 13.6512 13.9166 13.4335V11.9184C13.9166 11.8984 13.9157 11.8789 13.9139 11.8598V6.28464C13.9139 5.07037 13.5058 3.95143 12.8192 3.05751C12.7839 2.96932 12.7292 2.88935 12.6564 2.82722C11.8841 1.91002 10.7655 1.25676 9.58309 1.05969C9.26679 1.00669 8.94912 0.980707 8.63315 0.981978L8.6112 0.981934ZM2.46893 18.0991C2.67765 18.5716 2.93096 19.019 3.22622 19.4412C3.25261 19.4788 3.27487 19.5176 3.29325 19.5573C4.12518 20.6614 5.28831 21.4955 6.62804 21.9194C6.67945 21.9242 6.73043 21.9336 6.78032 21.9478C7.0879 22.0357 7.40031 22.1042 7.71543 22.1534C8.32985 22.2267 8.94856 22.2292 9.56299 22.1566C10.1306 22.0677 10.6862 21.9175 11.22 21.706C11.5881 21.5444 11.9423 21.3576 12.2798 21.1404C12.4359 21.0413 12.5862 20.9365 12.7335 20.8259C12.7635 20.8014 12.7914 20.7791 12.8192 20.7569L12.8192 20.7568L12.8193 20.7568L12.8193 20.7568L12.8194 20.7567L12.8194 20.7567L12.8194 20.7567C12.8879 20.7006 12.9564 20.6446 13.0218 20.5854C13.3024 20.336 13.5643 20.071 13.8075 19.7842C13.8438 19.7424 13.878 19.6995 13.9126 19.6563L13.9126 19.6562L13.9126 19.6562L13.9126 19.6562L13.9127 19.6562L13.9127 19.6562C13.93 19.6344 13.9474 19.6126 13.9653 19.5907C13.8592 19.7194 13.8864 19.685 13.9369 19.6211L13.937 19.621C13.9717 19.577 14.0174 19.5192 14.0382 19.4911C14.1442 19.3415 14.247 19.1856 14.3437 19.0297C14.5281 18.7253 14.6905 18.4099 14.8335 18.086C15.0416 17.5598 15.1901 17.0124 15.2791 16.4532C15.3149 16.1419 15.3351 15.8306 15.3351 15.5193C15.3351 15.2296 15.4657 14.981 15.6684 14.8134C15.8598 14.6228 16.1307 14.5147 16.4208 14.5397C16.9435 14.5848 17.3307 15.0451 17.2856 15.5678L17.2256 16.2645C16.8689 20.4009 13.6257 23.6446 9.58306 24.0808V26.8829H10.6597H13.9114C13.9198 26.8829 13.9281 26.883 13.9365 26.8832C14.4502 26.8939 14.8303 27.3166 14.8519 27.8183C14.8737 28.3233 14.406 28.7536 13.9166 28.7536H12.7412H7.56596H4.31427C4.30587 28.7536 4.29751 28.7535 4.28919 28.7532C3.77547 28.7426 3.39532 28.3199 3.37378 27.8182C3.35195 27.3131 3.8196 26.8829 4.30907 26.8829H5.48441H7.70728V24.1008H7.71248V24.0799C3.70731 23.6439 0.483906 20.451 0.0864413 16.3567L0.0108604 15.5781C-0.0398348 15.0559 0.342408 14.5915 0.864624 14.5408C1.13277 14.5147 1.38568 14.6029 1.57516 14.7655C1.80562 14.9426 1.9586 15.227 1.96046 15.5193C1.96331 15.8327 1.98179 16.1409 2.01827 16.4511C2.10666 17.0161 2.25875 17.5673 2.46893 18.0991ZM1.99476 16.2893C1.99889 16.3172 2.00268 16.3447 2.00635 16.3722C2.00234 16.3446 1.99847 16.317 1.99476 16.2893ZM14.7677 18.2472L14.7947 18.1823C14.7858 18.204 14.7768 18.2256 14.7677 18.2472ZM12.7758 20.795L12.7699 20.799L12.8029 20.7732L12.8116 20.7665C12.8147 20.7641 12.8164 20.7628 12.8161 20.7631C12.8064 20.7747 12.7908 20.7851 12.7758 20.795ZM11.3359 21.659L11.3757 21.6423L11.3108 21.6693L11.3359 21.659Z" fill="white" />
                                                            </svg> : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="20" viewBox="0 0 18 29" fill="none">
                                                                <path fillRule="evenodd" clipRule="evenodd" d="M9.64752 1.05969C10.8299 1.25676 11.9485 1.91002 12.7208 2.82722C12.9417 3.01563 12.9953 3.36822 12.8493 3.61615C12.8478 3.61927 12.8454 3.62316 12.8431 3.62706C12.8408 3.63096 12.8384 3.63485 12.8369 3.63797C12.6383 3.99907 12.4267 4.35372 12.2156 4.70772C12.0986 4.90386 11.9818 5.09981 11.8673 5.29655C11.5356 5.86497 11.2031 6.43416 10.8706 7.00336L10.8697 7.00483L10.8689 7.0063C10.5363 7.57562 10.2038 8.14494 9.87199 8.71348C9.48844 9.36987 9.1049 10.0271 8.72135 10.6842C8.33796 11.3411 7.95457 11.998 7.57118 12.6542C7.25474 13.1966 6.93752 13.7399 6.6203 14.2831C6.30308 14.8264 5.98586 15.3696 5.66943 15.9121C5.53693 16.1397 5.40443 16.3665 5.27193 16.5933C5.13943 16.8201 5.00693 17.0469 4.87443 17.2745C4.74972 17.4896 4.4972 17.605 4.25402 17.5707C3.99837 17.5364 3.82067 17.3649 3.73649 17.1248C3.61179 16.7694 3.53697 16.4078 3.4902 16.0368C3.44531 15.7057 3.44587 15.3747 3.44643 15.0413L3.44655 14.93V13.4086V9.08759V6.29108C3.44967 4.35503 4.50655 2.50939 6.2306 1.59592C7.28436 1.03787 8.47529 0.86328 9.64752 1.05969ZM11.6521 19.781C12.5282 19.1793 13.1922 18.3563 13.5975 17.3742C14.024 16.3392 14.0058 15.2023 13.988 14.0918L13.988 14.0917C13.9845 13.871 13.981 13.6512 13.981 13.4335V11.9184C13.981 11.3042 13.1268 11.0641 12.8181 11.6035L11.2468 14.3533C10.8307 15.0843 10.4137 15.8145 9.99677 16.5447L9.99636 16.5455L9.99594 16.5462L9.99552 16.5469L9.99344 16.5506L9.99067 16.5554C9.57568 17.2822 9.16069 18.0091 8.74648 18.7366C8.65143 18.9034 8.5556 19.0709 8.45976 19.2384C8.36386 19.406 8.26796 19.5737 8.17284 19.7405C8.1659 19.7527 8.15942 19.765 8.15339 19.7776C8.10834 19.8627 8.08403 19.9584 8.08866 20.0585C8.09025 20.0924 8.09435 20.1259 8.1008 20.1586C8.12925 20.3386 8.23026 20.506 8.39731 20.5947C8.40633 20.5995 8.41544 20.604 8.42462 20.6083C8.50941 20.654 8.60667 20.6799 8.71219 20.6789C9.75036 20.6727 10.7948 20.3703 11.6521 19.781ZM2.53336 18.0991C2.74208 18.5716 2.99539 19.019 3.29065 19.4412C3.59306 19.8715 3.353 20.4669 2.95395 20.7226C2.75442 20.8504 2.45824 20.8785 2.23377 20.8161C1.98748 20.7475 1.81913 20.5885 1.67572 20.3859C0.681193 18.9705 0.160549 17.2464 0.154314 15.5193C0.151196 14.9955 0.584547 14.6058 1.0896 14.584C1.59466 14.5621 2.02177 15.0298 2.02489 15.5193C2.02774 15.8327 2.04622 16.1409 2.0827 16.4511C2.17109 17.0161 2.32318 17.5673 2.53336 18.0991ZM2.05919 16.2893C2.06332 16.3172 2.06711 16.3447 2.07078 16.3722C2.06676 16.3446 2.0629 16.317 2.05919 16.2893ZM15.3995 15.5193C15.3995 15.8306 15.3793 16.1419 15.3435 16.4532C15.2546 17.0124 15.106 17.5598 14.898 18.086C14.755 18.4099 14.5925 18.7253 14.4081 19.0297C14.3115 19.1856 14.2086 19.3415 14.1026 19.4911C14.0818 19.5192 14.0362 19.577 14.0014 19.621L14.0013 19.6211C13.9509 19.685 13.9236 19.7194 14.0297 19.5908C14.0119 19.6126 13.9944 19.6344 13.9771 19.6562L13.9771 19.6562L13.9771 19.6562L13.9771 19.6562C13.9425 19.6995 13.9082 19.7424 13.8719 19.7842C13.6287 20.071 13.3668 20.336 13.0862 20.5854C13.0208 20.6446 12.9523 20.7007 12.8838 20.7567L12.8837 20.7568L12.8837 20.7568L12.8837 20.7568L12.8836 20.7569C12.8558 20.7791 12.828 20.8014 12.7979 20.8259C12.6506 20.9365 12.5003 21.0413 12.3442 21.1404C12.0067 21.3576 11.6525 21.5444 11.2844 21.706C10.7506 21.9175 10.195 22.0677 9.62742 22.1566C9.01299 22.2292 8.39428 22.2267 7.77986 22.1534C7.46474 22.1042 7.15232 22.0357 6.84475 21.9478C6.37399 21.8138 5.80658 22.1099 5.69434 22.6025C5.58211 23.1014 5.84399 23.6095 6.34905 23.7529C6.81814 23.8864 7.29601 23.9785 7.77691 24.0299V26.883H5.55404H4.3787C3.88923 26.883 3.42158 27.3132 3.44341 27.8183C3.46523 28.3265 3.85494 28.7536 4.3787 28.7536H7.63039H12.8057H13.981C14.4705 28.7536 14.9381 28.3233 14.9163 27.8183C14.8945 27.3101 14.5048 26.883 13.981 26.883H10.7293H9.64749V24.0265C10.7419 23.9058 11.8133 23.5772 12.7932 23.0484C14.5391 22.1099 15.8734 20.5667 16.6341 18.7491C17.0612 17.7328 17.267 16.626 17.2701 15.5224C17.2701 15.0329 16.8399 14.5653 16.3348 14.5871C15.8266 14.6058 15.3995 14.9955 15.3995 15.5193ZM14.8321 18.2472L14.8592 18.1823C14.8502 18.204 14.8412 18.2256 14.8321 18.2472ZM12.8403 20.795L12.8343 20.799L12.8673 20.7732C12.8722 20.7694 12.876 20.7665 12.8782 20.7648C12.8799 20.7635 12.8807 20.7629 12.8805 20.7631C12.8708 20.7747 12.8552 20.7851 12.8403 20.795ZM11.4401 21.6423C11.4185 21.6514 11.3969 21.6604 11.3753 21.6693L11.4401 21.6423ZM14.9663 2.52818C14.9035 2.63261 14.8408 2.73783 14.7781 2.84305L14.778 2.8431C14.7153 2.94831 14.6526 3.05351 14.5898 3.15794L14.3142 3.61998L14.3142 3.62004C14.0671 4.0345 13.8195 4.44972 13.5703 4.86328C13.3178 5.28567 13.0661 5.70729 12.8144 6.1289L12.8121 6.13265C12.5611 6.55311 12.3101 6.97356 12.0583 7.3948L12.0577 7.39573L12.0576 7.39601C11.4461 8.42131 10.8346 9.4466 10.22 10.4719C9.88351 11.035 9.54779 11.5973 9.21207 12.1596L9.21027 12.1626C8.8737 12.7263 8.53714 13.29 8.19978 13.8545C7.85945 14.4235 7.51989 14.9924 7.18034 15.5613C6.84073 16.1303 6.50113 16.6993 6.16074 17.2683L6.16045 17.2688C5.53001 18.3255 4.89957 19.3823 4.266 20.439C3.99933 20.8864 3.73267 21.333 3.46601 21.7796C3.19938 22.2262 2.93276 22.6728 2.66613 23.1201L1.50858 25.0562C1.44793 25.158 1.38694 25.2595 1.32595 25.361L1.32591 25.3611C1.20392 25.564 1.08194 25.767 0.962742 25.9728C0.959609 25.979 0.955696 25.9852 0.95178 25.9914L0.951763 25.9915C0.947841 25.9977 0.94392 26.0039 0.940783 26.0102C0.689824 26.4311 0.830988 27.0546 1.27958 27.2884C1.73444 27.5253 2.2991 27.4038 2.56574 26.9517C2.62848 26.8473 2.69122 26.742 2.75396 26.6368C2.8167 26.5316 2.87944 26.4264 2.94218 26.3219L3.21798 25.8596L3.2182 25.8592C3.46518 25.445 3.71261 25.0299 3.96171 24.6166C4.2141 24.1944 4.46571 23.7729 4.71731 23.3515C4.96919 22.9296 5.22107 22.5077 5.47374 22.0851C6.08545 21.0594 6.69716 20.0337 7.31201 19.008C7.64925 18.4437 7.98571 17.8801 8.32216 17.3166C8.65859 16.7531 8.99502 16.1896 9.33224 15.6253C9.67258 15.0564 10.0121 14.4875 10.3517 13.9185C10.6913 13.3495 11.0309 12.7805 11.3713 12.2115L11.3715 12.2111L11.3717 12.2108C12.0021 11.1541 12.6325 10.0975 13.266 9.04091C13.5327 8.59356 13.7993 8.147 14.0659 7.70043C14.3326 7.25379 14.5992 6.80716 14.8659 6.35974L16.0234 4.4237C16.084 4.322 16.1449 4.22065 16.2058 4.1193L16.2061 4.11878C16.3281 3.91582 16.4501 3.71285 16.5693 3.50711C16.5724 3.50087 16.5763 3.49464 16.5803 3.4884C16.5842 3.48217 16.5881 3.47593 16.5912 3.4697C16.8422 3.04882 16.701 2.42529 16.2524 2.19147C15.8007 1.95453 15.2361 2.07924 14.9663 2.52818Z" fill="white" />
                                                            </svg>
                                                        }

                                                        {/* <i className="fa-solid fa-microphone-slash" /> */}
                                                    </a>
                                                    {/* Video a */}
                                                    <a className={`audio-vid-btn ${this.state.cameraShow == false ? "active" : ''}`} onClick={() => this.setState({ cameraShow: !this.state.cameraShow })} >
                                                        {
                                                            this.state.cameraShow ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="27" viewBox="0 0 27 17" fill="none">
                                                                <path d="M25.5129 2.24803C25.0666 1.99303 24.5566 1.99303 24.1104 2.24803L18.9252 5.25144V1.65302C18.9252 0.873831 18.2594 0.264648 17.4802 0.264648H2.13728C1.3581 0.264648 0.720581 0.866748 0.720581 1.65302V14.885C0.720581 15.6642 1.3581 16.2734 2.13728 16.2734H17.4802C18.2594 16.2734 18.9252 15.6713 18.9252 14.885V11.2866L24.1104 14.29C24.3299 14.4175 24.5708 14.4813 24.8116 14.4813C25.0525 14.4813 25.2933 14.4175 25.52 14.29C25.9662 14.035 26.2283 13.5746 26.2283 13.0646V3.47348C26.2212 2.96347 25.9592 2.50304 25.5129 2.24803Z" fill="white" />
                                                            </svg> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="27" viewBox="0 0 27 27" fill="none">
                                                                <path d="M15.7674 1.40932C15.6427 1.6182 15.518 1.8302 15.3933 2.03908C15.0566 2.60649 14.7199 3.17701 14.3801 3.74442C13.8781 4.5893 13.3793 5.43106 12.8774 6.27594C12.2694 7.30164 11.6615 8.32734 11.0504 9.35304C10.3801 10.4816 9.71296 11.6071 9.04267 12.7357C8.36614 13.8736 7.69273 15.0115 7.01621 16.1495C6.38956 17.2064 5.76292 18.2632 5.13316 19.3201C4.60316 20.2149 4.07316 21.1065 3.54317 22.0013C3.1597 22.6466 2.77623 23.292 2.39276 23.9373C2.21194 24.2428 2.028 24.5453 1.85029 24.8539C1.84406 24.8664 1.83471 24.8788 1.82847 24.8913C1.57906 25.3122 1.71935 25.9357 2.16517 26.1695C2.61723 26.4065 3.1784 26.2849 3.4434 25.8328C3.56811 25.624 3.69281 25.412 3.81752 25.2031C4.15422 24.6357 4.49093 24.0651 4.83075 23.4977C5.33269 22.6529 5.83151 21.8111 6.33345 20.9662C6.94139 19.9405 7.54932 18.9148 8.16038 17.8891C8.83067 16.7605 9.49784 15.6351 10.1681 14.5065C10.8447 13.3685 11.5181 12.2306 12.1946 11.0927C12.8212 10.0358 13.4479 8.97892 14.0776 7.92205C14.6076 7.02729 15.1376 6.13564 15.6676 5.24088C16.0511 4.59553 16.4346 3.95018 16.818 3.30484C16.9989 2.99931 17.1828 2.6969 17.3605 2.38825C17.3667 2.37578 17.3761 2.36331 17.3823 2.35084C17.6317 1.92996 17.4914 1.30643 17.0456 1.07261C16.5967 0.835671 16.0355 0.960377 15.7674 1.40932Z" fill="white" />
                                                                <path fillRule="evenodd" clipRule="evenodd" d="M11.811 6.14606H2.1373C1.35811 6.14606 0.720596 6.74817 0.720596 7.53442V20.7664C0.720596 21.5456 1.35811 22.1548 2.1373 22.1548H2.31012C2.97336 21.0377 3.63573 19.9205 4.2981 18.8034C4.98949 17.6404 5.67929 16.4775 6.36909 15.3145C7.06284 14.1449 7.75658 12.9753 8.45192 11.8058C9.13687 10.6525 9.82022 9.50085 10.5036 8.34918C10.9392 7.61493 11.3749 6.88068 11.811 6.14606ZM6.77078 22.1548C7.46124 20.9921 8.15018 19.8309 8.83923 18.6697C9.47859 17.5922 10.118 16.5146 10.7589 15.4356C11.4522 14.2693 12.144 13.103 12.8358 11.9368C13.5276 10.7705 14.2193 9.60425 14.9127 8.43799C15.3657 7.67401 15.8186 6.91003 16.2719 6.14606H17.4802C18.2594 6.14606 18.9252 6.75525 18.9252 7.53442V11.1329L24.1104 8.12946C24.5566 7.87445 25.0666 7.87445 25.5129 8.12946C25.9592 8.38446 26.2213 8.84485 26.2283 9.35492V18.946C26.2283 19.456 25.9662 19.9164 25.52 20.1714C25.2933 20.299 25.0525 20.3627 24.8116 20.3627C24.5708 20.3627 24.33 20.299 24.1104 20.1714L18.9252 17.168V20.7664C18.9252 21.5527 18.2594 22.1548 17.4802 22.1548H6.77078Z" fill="white" />
                                                            </svg>
                                                        }

                                                        {/* <i className="fa-solid fa-video" /> */}
                                                    </a>
                                                </div>
                                            </div>
                                            <div className="join-meeting-form">
                                                <h2>Ready to join</h2>
                                                <p>Bring ship, shore, and remote teams together, every time.</p>
                                                <div className="formfield">
                                                    <label htmlFor="">Meeting ID</label>
                                                    {/* <input type="text" placeholder={'124567890'} {...formik.getFieldProps("meetingId")} />
                                                     */}
                                                    <Field name="meetingId" type="text" />
                                                    <div className="input-right" onClick={() => {
                                                        if (props.values.meetingId) {
                                                            toast.success("Copy to clipboard", { autoClose: 500 });
                                                            navigator.clipboard.writeText(props.values.meetingId)
                                                        }

                                                    }}>
                                                        <a>
                                                            <img src="images/copy.png" alt="" />
                                                        </a>
                                                    </div>
                                                </div>
                                                <div className='error'>
                                                    <ErrorMessage name="meetingId" />
                                                </div>
                                                <div className="formfield">
                                                    <label htmlFor="">Email ID</label>
                                                    {/* <input type="email" placeholder="nolancurtis@gmail.com" {...formik.getFieldProps("emailId")} /> */}
                                                    <Field name="emailId" type="text" />
                                                </div>
                                                <div className='error'>
                                                    <ErrorMessage name="emailId" />
                                                </div>
                                                <div className="formfield">
                                                    <label htmlFor="">Display name</label>
                                                    {/* <input type="text" placeholder="Display name" {...formik.getFieldProps("displayName")} /> */}
                                                    <Field name="displayName" type="test" />
                                                </div>
                                                <div className='error'>
                                                    <ErrorMessage name="displayName" />
                                                </div>

                                                <button type="submit" className="btn primary-btn" onClick={(e: any) => props.handleSubmit(e)} disabled={this.state.loader}>
                                                    {
                                                        this.state.loader ? <span className="loader" /> : this.state.userType === "host" ? 'Start meeting' : this.state.userType === "participant" ? 'Join Now' : "Join/Start meeting"
                                                    }
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="background-design" />
                                </div>
                            </section>
                            <img className="absolute-bg-img" src="images/onship-background.png" alt="" />
                        </div>
                    )
                }
            </Formik>
        );
    }


    /* <div className = 'header'>
                    <div className = 'header-image' />
                    <div className = 'header-container'>
                        <div className = 'header-watermark-container'>
                            <div className = 'welcome-watermark'>
                                <Watermarks
                                    defaultJitsiLogoURL = { DEFAULT_WELCOME_PAGE_LOGO_URL }
                                    noMargins = { true } />
                            </div>
                        </div>
                        <div className = 'welcome-page-settings'>
                            <SettingsButton
                                defaultTab = { SETTINGS_TABS.CALENDAR }
                                isDisplayedOnWelcomePage = { true } />
                            { showAdditionalToolbarContent
                                ? <div
                                    className = 'settings-toolbar-content'
                                    ref = { this._setAdditionalToolbarContentRef } />
                                : null
                            }
                        </div>
                        <h1 className = 'header-text-title'>
                            { t('welcomepage.headerTitle') }
                        </h1>
                        <span className = 'header-text-subtitle'>
                            { t('welcomepage.headerSubtitle')}
                        </span>
                        <div id = 'enter_room'>
                            <div className = 'join-meeting-container'>
                                <div className = 'enter-room-input-container'>
                                    <form onSubmit = { this._onFormSubmit }>
                                        <input
                                            aria-disabled = 'false'
                                            aria-label = 'Meeting name input'
                                            autoFocus = { true }
                                            className = 'enter-room-input'
                                            id = 'enter_room_field'
                                            onChange = { this._onRoomChange }
                                            pattern = { ROOM_NAME_VALIDATE_PATTERN_STR }
                                            placeholder = { this.state.roomPlaceholder }
                                            ref = { this._setRoomInputRef }
                                            title = { t('welcomepage.roomNameAllowedChars') }
                                            type = 'text'
                                            value = { this.state.room } />
                                    </form>
                                </div>
                                <button
                                    aria-disabled = 'false'
                                    aria-label = 'Start meeting'
                                    className = 'welcome-page-button'
                                    id = 'enter_room_button'
                                    onClick = { this._onFormSubmit }
                                    tabIndex = { 0 }
                                    type = 'button'>
                                    { t('welcomepage.startMeeting') }
                                </button>
                            </div>
                        </div>
                        { this._renderInsecureRoomNameWarning() }

                        { _moderatedRoomServiceUrl && (
                            <div id = 'moderated-meetings'>
                                {
                                    translateToHTML(
                                    t, 'welcomepage.moderatedMessage', { url: _moderatedRoomServiceUrl })
                                }
                            </div>)}
                    </div>
                </div>

                <div className = 'welcome-cards-container'>
                    <div className = 'welcome-card-column'>
                        <div className = 'welcome-tabs welcome-card welcome-card--blue'>
                            { this._renderTabs() }
                        </div>
                        { showAdditionalCard
                            ? <div
                                className = 'welcome-card welcome-card--dark'
                                ref = { this._setAdditionalCardRef } />
                            : null }
                    </div>

                    { showAdditionalContent
                        ? <div
                            className = 'welcome-page-content'
                            ref = { this._setAdditionalContentRef } />
                        : null }
                </div>
                { DISPLAY_WELCOME_FOOTER && this._renderFooter()} */

    /**
     * 
     * @param formikData 
     */
    async _initMeeting(formikData: {
        emailId: string,
        meetingId: string,
        displayName: string,
        entryJWT: string
    }) {
        if (!formikData.entryJWT) {
            this._userAuthentication(formikData)
        }
        else if (this.state.userType === "participant") {
            this._userAuthentication(formikData)
        }
        else if (this.state.userType === "host") {
            this._startMeeting(formikData)
        }
        else {
            toast.error("SOMETHING WENT WRONG IN USER_TYPE");
        }

    }

    /**
     * 
     */
    async _startMeeting(formikData: {
        emailId: string,
        meetingId: string,
        displayName: string,
        entryJWT: string
    }) {
        try {
            this.setState({ loader: true });
            let response = await AxiosApiHitter("START_MEETING", {
                meetingId: formikData?.meetingId,
                userEmail: formikData?.emailId
            })
            this.setState({ loader: false });
            if (response?.data?.code === 200) {
                let content = {
                    "context": {
                        "user": {
                            "avatar": "",
                            "name": formikData?.displayName,
                            "email": formikData?.emailId,
                            "affiliation": "owner",
                            "lobby_bypass": true
                        }
                    },
                    "aud": "jitsi",
                    "iss": Config?.JITSI_APP_ID,
                    "sub": Config?.SELF_HOSTED_JITSI_SERVER,
                    "room": "*",
                    "exp": 2550716253,
                    "nbf": 1697004697
                };

                let token = sign(content, Config?.JITSI_SECRET_KEY);
                window.location.replace(`/${formikData?.meetingId}?jwt=${token}#config.startWithVideoMuted=${!this.state.cameraShow}&config.startWithAudioMuted=${!this.state.micShow}`);
                toast.success("Please wait! while redirect to your meeting");
            } else {
                throw new Error(response?.data?.error);
            }
        }
        catch (err: any) {
            toast.error(err.message || "Something went wrong")
        }
    }

    async _userAuthentication(formikData: {
        emailId: string,
        meetingId: string,
        displayName: string,
        entryJWT: string
    }) {
        try {
            this.setState({ loader: true });
            let response = await AxiosApiHitter('AUTH_MEETING', {
                meetingId: formikData?.meetingId,
                userEmail: formikData?.emailId
            })
            this.setState({ loader: false });
            if (response?.data?.code === 200) {
                if (response?.data?.role === "host" && !formikData.entryJWT) {
                    return this._startMeeting(formikData);
                }
                let content = {
                    "context": {
                        "user": {
                            "avatar": "",
                            "name": formikData?.displayName,
                            "email": formikData?.emailId,
                            "affiliation": response?.data?.role === "host" ? "owner" : "member",
                            "lobby_bypass": response?.data?.role === "host" ? true : false
                        }
                    },
                    "aud": "jitsi",
                    "iss": Config?.JITSI_APP_ID,
                    "sub": Config?.SELF_HOSTED_JITSI_SERVER,
                    "room": "*",
                    "exp": 2550716253,
                    "nbf": 1697004697
                };
                let token = sign(content, Config?.JITSI_SECRET_KEY);
                window.location.replace(`/${formikData?.meetingId}?jwt=${token}#config.startWithVideoMuted=${!this.state.cameraShow}&config.startWithAudioMuted=${!this.state.micShow}`);
                toast.success("Please wait! while redirect to the meeting");

            } else {
                throw new Error(response?.data?.errorMesg);
            }
        }
        catch (err: any) {
            this.setState({
                loader: false
            });
            toast.error(err.message || "Something went wrong");
            // alert(err?.message);
        }
    }

    /**
     * Renders the insecure room name warning.
     *
     * @inheritdoc
     */
    _doRenderInsecureRoomNameWarning() {
        return (
            <div className='insecure-room-name-warning'>
                <Icon src={IconWarning} />
                <span>
                    {getUnsafeRoomText(this.props.t, 'welcome')}
                </span>
            </div>
        );
    }

    /**
     * Prevents submission of the form and delegates join logic.
     *
     * @param {Event} event - The HTML Event which details the form submission.
     * @private
     * @returns {void}
     */
    _onFormSubmit(event: React.FormEvent) {
        event.preventDefault();

        if (!this._roomInputRef || this._roomInputRef.reportValidity()) {
            this._onJoin();
        }
    }

    /**
     * Overrides the super to account for the differences in the argument types
     * provided by HTML and React Native text inputs.
     *
     * @inheritdoc
     * @override
     * @param {Event} event - The (HTML) Event which details the change such as
     * the EventTarget.
     * @protected
     */
    // @ts-ignore
    // eslint-disable-next-line require-jsdoc
    _onRoomChange(event: React.ChangeEvent<HTMLInputElement>) {
        super._onRoomChange(event.target.value);
    }

    /**
     * Renders the footer.
     *
     * @returns {ReactElement}
     */
    _renderFooter() {
        const {
            t,
            _deeplinkingCfg: {
                ios = { downloadLink: undefined },
                android = {
                    fDroidUrl: undefined,
                    downloadLink: undefined
                }
            }
        } = this.props;

        const { downloadLink: iosDownloadLink } = ios;

        const { fDroidUrl, downloadLink: androidDownloadLink } = android;

        return (<footer className='welcome-footer'>
            <div className='welcome-footer-centered'>
                <div className='welcome-footer-padded'>
                    <div className='welcome-footer-row-block welcome-footer--row-1'>
                        <div className='welcome-footer-row-1-text'>{t('welcomepage.jitsiOnMobile')}</div>
                        <a
                            className='welcome-badge'
                            href={iosDownloadLink}>
                            <img
                                alt={t('welcomepage.mobileDownLoadLinkIos')}
                                src='./images/app-store-badge.png' />
                        </a>
                        <a
                            className='welcome-badge'
                            href={androidDownloadLink}>
                            <img
                                alt={t('welcomepage.mobileDownLoadLinkAndroid')}
                                src='./images/google-play-badge.png' />
                        </a>
                        <a
                            className='welcome-badge'
                            href={fDroidUrl}>
                            <img
                                alt={t('welcomepage.mobileDownLoadLinkFDroid')}
                                src='./images/f-droid-badge.png' />
                        </a>
                    </div>
                </div>
            </div>
        </footer>);
    }

    /**
     * Renders tabs to show previous meetings and upcoming calendar events. The
     * tabs are purposefully hidden on mobile browsers.
     *
     * @returns {ReactElement|null}
     */
    _renderTabs() {
        if (isMobileBrowser()) {
            return null;
        }

        const { _calendarEnabled, _recentListEnabled, t } = this.props;

        const tabs = [];

        if (_calendarEnabled) {
            tabs.push({
                id: 'calendar',
                label: t('welcomepage.upcomingMeetings'),
                content: <CalendarList />
            });
        }

        if (_recentListEnabled) {
            tabs.push({
                id: 'recent',
                label: t('welcomepage.recentMeetings'),
                content: <RecentList />
            });
        }

        if (tabs.length === 0) {
            return null;
        }

        return (
            <Tabs
                accessibilityLabel={t('welcomepage.meetingsAccessibilityLabel')}
                tabs={tabs} />
        );
    }

    /**
     * Sets the internal reference to the HTMLDivElement used to hold the
     * additional card shown near the tabs card.
     *
     * @param {HTMLDivElement} el - The HTMLElement for the div that is the root
     * of the welcome page content.
     * @private
     * @returns {void}
     */
    _setAdditionalCardRef(el: HTMLDivElement) {
        this._additionalCardRef = el;
    }

    /**
     * Sets the internal reference to the HTMLDivElement used to hold the
     * welcome page content.
     *
     * @param {HTMLDivElement} el - The HTMLElement for the div that is the root
     * of the welcome page content.
     * @private
     * @returns {void}
     */
    _setAdditionalContentRef(el: HTMLDivElement) {
        this._additionalContentRef = el;
    }

    /**
     * Sets the internal reference to the HTMLDivElement used to hold the
     * toolbar additional content.
     *
     * @param {HTMLDivElement} el - The HTMLElement for the div that is the root
     * of the additional toolbar content.
     * @private
     * @returns {void}
     */
    _setAdditionalToolbarContentRef(el: HTMLDivElement) {
        this._additionalToolbarContentRef = el;
    }

    /**
     * Sets the internal reference to the HTMLInputElement used to hold the
     * welcome page input room element.
     *
     * @param {HTMLInputElement} el - The HTMLElement for the input of the room name on the welcome page.
     * @private
     * @returns {void}
     */
    _setRoomInputRef(el: HTMLInputElement) {
        this._roomInputRef = el;
    }

    /**
     * Returns whether or not an additional card should be displayed near the tabs.
     *
     * @private
     * @returns {boolean}
     */
    _shouldShowAdditionalCard() {
        return interfaceConfig.DISPLAY_WELCOME_PAGE_ADDITIONAL_CARD
            && this._additionalCardTemplate
            && this._additionalCardTemplate.content
            && this._additionalCardTemplate.innerHTML.trim();
    }

    /**
     * Returns whether or not additional content should be displayed below
     * the welcome page's header for entering a room name.
     *
     * @private
     * @returns {boolean}
     */
    _shouldShowAdditionalContent() {
        return interfaceConfig.DISPLAY_WELCOME_PAGE_CONTENT
            && this._additionalContentTemplate
            && this._additionalContentTemplate.content
            && this._additionalContentTemplate.innerHTML.trim();
    }

    /**
     * Returns whether or not additional content should be displayed inside
     * the header toolbar.
     *
     * @private
     * @returns {boolean}
     */
    _shouldShowAdditionalToolbarContent() {
        return interfaceConfig.DISPLAY_WELCOME_PAGE_TOOLBAR_ADDITIONAL_CONTENT
            && this._additionalToolbarContentTemplate
            && this._additionalToolbarContentTemplate.content
            && this._additionalToolbarContentTemplate.innerHTML.trim();
    }
}

export default translate(connect(_mapStateToProps)(WelcomePage));
