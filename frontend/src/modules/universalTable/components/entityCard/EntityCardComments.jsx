import { useState } from "react";

import sendIcon from "../../../../assets/icons/SendHorizonal.svg";
import attachmentIcon from "../../../../assets/icons/Paperclip.svg";
import mentionIcon from "../../../../assets/icons/AtSign.svg";
import reactionIcon from "../../../../assets/icons/SmilePlus.svg";

import {
  entityCardCommentsStyle,
  entityCardCommentsHeaderStyle,
  entityCardCommentsTitleStyle,
  entityCardCommentsListStyle,
  entityCardCommentCardStyle,
  entityCardCommentTopStyle,
  entityCardCommentAvatarStyle,
  entityCardCommentAuthorStyle,
  entityCardCommentDateStyle,
  entityCardCommentTextStyle,
  entityCardCommentActionsStyle,
  entityCardCommentActionButtonStyle,
  entityCardCommentInputWrapperStyle,
  entityCardCommentTextareaStyle,
  entityCardCommentToolbarStyle,
  entityCardCommentToolbarLeftStyle,
  entityCardCommentToolbarButtonStyle,
  entityCardCommentSendButtonStyle,
  entityCardCommentIconStyle,
} from "./styles/entityCardCommentsStyles";

export default function EntityCardComments({ row }) {
  const [comment, setComment] = useState("");

  const comments = Array.isArray(row?.comments) ? row.comments : [];

  return (
    <aside style={entityCardCommentsStyle}>
      <div style={entityCardCommentsHeaderStyle}>
        <div style={entityCardCommentsTitleStyle}>Комментарии</div>
      </div>

      <div style={entityCardCommentsListStyle}>
        {!comments.length && (
          <div style={entityCardCommentDateStyle}>Комментариев пока нет</div>
        )}

        {comments.map((item) => (
          <div key={item.id} style={entityCardCommentCardStyle}>
            <div style={entityCardCommentTopStyle}>
              <div style={entityCardCommentAvatarStyle}>
                {item.author?.[0] || "?"}
              </div>

              <div>
                <div style={entityCardCommentAuthorStyle}>
                  {item.author || "Пользователь"}
                </div>

                <div style={entityCardCommentDateStyle}>{item.date || ""}</div>
              </div>
            </div>

            <div style={entityCardCommentTextStyle}>{item.text}</div>

            <div style={entityCardCommentActionsStyle}>
              <button type="button" style={entityCardCommentActionButtonStyle}>
                <img src={reactionIcon} alt="" style={entityCardCommentIconStyle} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={entityCardCommentInputWrapperStyle}>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Написать комментарий..."
          style={entityCardCommentTextareaStyle}
        />

        <div style={entityCardCommentToolbarStyle}>
          <div style={entityCardCommentToolbarLeftStyle}>
            <button type="button" style={entityCardCommentToolbarButtonStyle}>
              <img src={attachmentIcon} alt="" style={entityCardCommentIconStyle} />
            </button>

            <button type="button" style={entityCardCommentToolbarButtonStyle}>
              <img src={mentionIcon} alt="" style={entityCardCommentIconStyle} />
            </button>
          </div>

          <button type="button" style={entityCardCommentSendButtonStyle}>
            <img src={sendIcon} alt="" style={entityCardCommentIconStyle} />
          </button>
        </div>
      </div>
    </aside>
  );
}