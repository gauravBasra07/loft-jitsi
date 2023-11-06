import _ from 'lodash';
import { connect } from 'react-redux';

import { createToolbarEvent } from '../../analytics/AnalyticsEvents';
import { sendAnalytics } from '../../analytics/functions';
import { leaveConference } from '../../base/conference/actions';
import { translate } from '../../base/i18n/functions';
import { IProps as AbstractButtonProps } from '../../base/toolbox/components/AbstractButton';
import AbstractHangupButton from '../../base/toolbox/components/AbstractHangupButton';
import { getLocalParticipant } from '../../base/participants/functions';
import { AxiosApiHitter } from '../../modules';
import { AllMessages } from '../../modules/AxiosApi/AllMessages';
import { toast } from 'react-toastify';

/**
 * Component that renders a toolbar button for leaving the current conference.
 *
 * @augments AbstractHangupButton
 */
class HangupButton extends AbstractHangupButton<AbstractButtonProps> {
    _hangup: Function;

    accessibilityLabel = 'toolbar.accessibilityLabel.hangup';
    label = 'toolbar.hangup';
    tooltip = 'toolbar.hangup';

    /**
     * Initializes a new HangupButton instance.
     *
     * @param {Props} props - The read-only properties with which the new
     * instance is to be initialized.
     */
    constructor(props: AbstractButtonProps) {
        super(props);

        this._hangup = _.once(async () => {
            // sendAnalytics(createToolbarEvent('hangup'));
            // this.props.dispatch(leaveConference());
            const state = APP.store.getState()
            const { email } = getLocalParticipant(state) ?? {};
            try {

                let response = await AxiosApiHitter("LEAVE_MEETING", {
                    meetingId: window.location.pathname?.split('/')[1] || "",
                    userEmail: email || ""
                })
                if (response?.data?.code == 200) {
                    toast.success(AllMessages?.LEAVE_CONFERENCE_MESSAGE);
                    sendAnalytics(createToolbarEvent('hangup'));
                    this.props.dispatch(leaveConference());
                }
                else {
                    throw new Error(response?.data?.error)
                }
            }
            catch (err:any) {
                toast.error(err.message);
            }
        });
    }

    /**
     * Helper function to perform the actual hangup action.
     *
     * @override
     * @protected
     * @returns {void}
     */
    _doHangup() {
        this._hangup();
    }
}

export default translate(connect()(HangupButton));
