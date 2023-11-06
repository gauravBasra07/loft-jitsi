import React, { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { endConference } from '../../../base/conference/actions';
import { isLocalParticipantModerator } from '../../../base/participants/functions';
import { BUTTON_TYPES } from '../../../base/ui/constants.web';
import { isInBreakoutRoom } from '../../../breakout-rooms/functions';

import { HangupContextMenuItem } from './HangupContextMenuItem';
// import { getLocalParticipant } from '../participants/functions';
import { getLocalParticipant } from '../../../base/participants/functions';
import { AxiosApiHitter } from "../../../modules";
import { AllMessages } from "../../../modules/AxiosApi/AllMessages";
import { toast } from 'react-toastify';


/**
 * The type of the React {@code Component} props of {@link EndConferenceButton}.
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
 * Button to end the conference for all participants.
 *
 * @param {Object} props - Component's props.
 * @returns {JSX.Element} - The end conference button.
 */
export const EndConferenceButton = (props: IProps) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const _isLocalParticipantModerator = useSelector(isLocalParticipantModerator);
    const _isInBreakoutRoom = useSelector(isInBreakoutRoom);
    const toastId: any = useRef(null);

    const onEndConference = useCallback(async () => {
        // dispatch(endConference());

        //getting user info
        const state = APP.store.getState()
        const { email } = getLocalParticipant(state) ?? {};
        try {
            toastId.current = toast.loading(AllMessages.WAITING_API_RESPONSE_MESSAGE);
            let response = await AxiosApiHitter("END_MEETING", {
                meetingId: window.location.pathname?.split('/')[1] || "",
                userEmail: email || ""
            })

            if (response?.data?.code == 200) {
                toast.update(toastId.current, {
                    render: AllMessages?.END_CONFERENCE_MESSAGE,
                    type: "success",
                    isLoading: false,
                    autoClose: 2000,
                    closeButton: true
                })
                dispatch(endConference());
            }
            else {
                throw new Error(response?.data?.error)
            }
        }
        catch (err: any) {
            toast.update(toastId.current, {
                render: err.message,
                type: "error",
                isLoading: false,
                autoClose: 2000,
                closeButton: true
            })
        }

        console.log("endConference");
    }, [dispatch]);

    return (<>
        {!_isInBreakoutRoom && _isLocalParticipantModerator && <HangupContextMenuItem
            accessibilityLabel={t('toolbar.accessibilityLabel.endConference')}
            buttonKey={props.buttonKey}
            buttonType={BUTTON_TYPES.DESTRUCTIVE}
            label={t('toolbar.endConference')}
            notifyMode={props.notifyMode}
            onClick={onEndConference} />}
    </>);
};
