/* eslint-disable react/prop-types */
import React, { Component } from "react";
import { Link } from "react-router";
import { t } from "ttag";

import Icon from "metabase/components/Icon";
import QuestionPicker from "metabase/containers/QuestionPicker";
import PopoverWithTrigger from "metabase/components/PopoverWithTrigger";
import SelectButton from "metabase/components/SelectButton";
import LoadingSpinner from "metabase/components/LoadingSpinner";

import Questions from "metabase/entities/questions";
import * as Urls from "metabase/lib/urls";
import { formatDateTimeWithUnit } from "metabase/lib/formatting";
import MetabaseSettings from "metabase/lib/settings";

@Questions.load({
  id: (state, { tag }) => tag["card-id"],
  loadingAndErrorWrapper: false,
})
export default class CardTagEditor extends Component {
  handleQuestionSelection = id => {
    const { question, query, setDatasetQuery } = this.props;
    setDatasetQuery(
      query.replaceCardId(question ? question.id : "", id).datasetQuery(),
    );
    this._popover && this._popover.close();
  };

  getQuestionUrl() {
    const { tag, question } = this.props;
    return Urls.question(question || { id: tag["card-id"] });
  }

  errorMessage() {
    const { error, question, query } = this.props;

    if (
      question &&
      // If this question was loaded by a search endpoint before fetching, it
      // might not have a database_id set yet.
      question.database_id != null &&
      question.database_id !== query.databaseId()
    ) {
      return t`This query can't be used because it's based on a different database.`;
    }
    if (error) {
      return error.status === 404
        ? t`Couldn't find a saved query with that ID number.`
        : error.data;
    }
    return null;
  }

  triggerElement() {
    const { tag, question } = this.props;
    return (
      <SelectButton>
        {tag["card-id"] == null ? (
          <span className="text-medium">{t`Pick a saved chart`}</span>
        ) : this.errorMessage() ? (
          <span
            className="text-medium"
            style={{ fontSize: 12 }}
          >{t`Pick a different chart`}</span>
        ) : question ? (
          question.name
        ) : (
          // we only hit this on the initial render before we fetch
          t`GETTING INSIGHTS...`
        )}
      </SelectButton>
    );
  }

  render() {
    const {
      tag: { "card-id": cardId },
      loading,
      question,
    } = this.props;

    return (
      <div className="px3 py4 border-top">
        <h3 className="text-heavy text-brand mb1">
          {cardId == null ? (
            t`Chart #…`
          ) : (
            <Link to={this.getQuestionUrl()}>{t`Chart #${cardId}`}</Link>
          )}
        </h3>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <PopoverWithTrigger
            ref={ref => (this._popover = ref)}
            triggerElement={this.triggerElement()}
            verticalAttachments={["top", "bottom"]}
            horizontalAttachments={["right", "left"]}
            pinInitialAttachment
          >
            <QuestionPicker
              className="p2"
              value={question && question.id}
              onChange={this.handleQuestionSelection}
            />
          </PopoverWithTrigger>
        )}
        {this.errorMessage() && (
          <p className="text-error bg-light p2 mt2 mb0">
            {this.errorMessage()}
          </p>
        )}
        {question && !this.errorMessage() && (
          <div className="bg-light text-medium text-small py1 px2 mt1">
            {question.collection && (
              <div className="flex align-center">
                <Icon name="all" size={12} mr={1} /> {question.collection.name}
              </div>
            )}
            <div className="flex align-center mt1">
              <Icon name="calendar" size={12} mr={1} />{" "}
              {t`Last edited ${formatDate(question.updated_at)}`}
            </div>
          </div>
        )}
      </div>
    );
  }
}

// This formats a timestamp as a date using any custom formatting options.
function formatDate(value) {
  const options = MetabaseSettings.get("custom-formatting")["type/Temporal"];
  return formatDateTimeWithUnit(value, "day", options);
}
