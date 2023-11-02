import React, { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { createToolbarEvent } from '../../../analytics/AnalyticsEvents';
import { sendAnalytics } from '../../../analytics/functions';
import { leaveConference } from '../../../base/conference/actions';
import { BUTTON_TYPES } from '../../../base/ui/constants.web';

import { HangupContextMenuItem } from './HangupContextMenuItem';
import { getLocalParticipant } from '../../../base/participants/functions';
import { AxiosApiHitter } from "../../../modules";
import { toast } from 'react-toastify';
import { AllMessages } from "../../../modules/AxiosApi/AllMessages";

/**
 * The type of the React {@code Component} props of {@link LeaveConferenceButton}.
 */
interface IProps {

    /**
     * Key to use for toolbarButtonClicked event.
     */
    buttonKey: string;

    /**
     * Notify mode for `toolbarButtonClicked` event -
     * whether to only notify or to also prevent button click routine.
     */
    notifyMode?: string;
}


/**
 * Button to leave the conference.
 *
 * @param {Object} props - Component's props.
 * @returns {JSX.Element} - The leave conference button.
 */
export const LeaveConferenceButton = (props: IProps) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const toastId: any = useRef(null);

    const onLeaveConference = useCallback(async () => {
        // sendAnalytics(createToolbarEvent('hangup'));
        // dispatch(leaveConference());

        // LEAVE_MEETING

        const state = APP.store.getState()
        const { email } = getLocalParticipant(state) ?? {};
        try {
            toastId.current = toast.loading(AllMessages.WAITING_API_RESPONSE_MESSAGE);
            let response = await AxiosApiHitter("LEAVE_MEETING", {
                meetingId: window.location.pathname?.split('/')[1] || "",
                userEmail: email || ""
            })
            if (response?.data?.code == 200) {
                toast.update(toastId.current, {
                    render: AllMessages?.LEAVE_CONFERENCE_MESSAGE,
                    type: "success",
                    isLoading: false,
                    autoClose: 2000,
                    closeButton: true
                })
                sendAnalytics(createToolbarEvent('hangup'));
                dispatch(leaveConference());
            }
            else {
                throw new Error(response?.data?.error)
            }
        }
        catch (err) {
            toast.update(toastId.current, {
                render: err.message,
                type: "error",
                isLoading: false,
                autoClose: 2000,
                closeButton: true
            })
        }
    }, [dispatch]);

    return (
        <HangupContextMenuItem
            accessibilityLabel={t('toolbar.accessibilityLabel.leaveConference')}
            buttonKey={props.buttonKey}
            buttonType={BUTTON_TYPES.SECONDARY}
            label={t('toolbar.leaveConference')}
            notifyMode={props.notifyMode}
            onClick={onLeaveConference} />
    );
};
