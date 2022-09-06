import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import RedisPubSub from '/imports/startup/server/redis';
import RegexWebUrl from '/imports/utils/regex-weburl';
import { extractCredentials } from '/imports/api/common/server/helpers';
import Logger from '/imports/startup/server/logger';

const HTML_SAFE_MAP = {
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

var Filter = require('bad-words'),
    swearWordsFilter = new Filter({ placeHolder: '•'});
    swearWordsFilter.addWords('arsehole', 'drugs', 'suicide');

const parseMessage = (message) => {
  let parsedMessage = message || '';
  parsedMessage = parsedMessage.trim();

  // Replace <br/> with \n\r
  parsedMessage = parsedMessage.replace(/<br\s*[\\/]?>/gi, '\n\r');

  // Sanitize. See: http://shebang.brandonmintern.com/foolproof-html-escaping-in-javascript/
  parsedMessage = parsedMessage.replace(/[<>'"]/g, (c) => HTML_SAFE_MAP[c]);

  // Replace flash links to flash valid ones
  parsedMessage = parsedMessage.replace(RegexWebUrl, "<a href='event:$&'><u>$&</u></a>");

  // TOS: block messages containing swear words, phone numbers and email addresses
  let isProfane = swearWordsFilter.isProfane(parsedMessage);
  let isEmail = parsedMessage.match(/[\w-\.]+@([\w-]+\.)+[\w-]{2,4}/gi);
  let isPhone = parsedMessage.match(/(((\+44\s?\d{4}|\(?0\d{4}\)?)\s?\d{3}\s?\d{3})|((\+44\s?\d{3}|\(?0\d{3}\)?)\s?\d{3}\s?\d{4})|((\+44\s?\d{2}|\(?0\d{2}\)?)\s?\d{4}\s?\d{4}))(\s?\#(\d{4}|\d{3}))?/g);
  if (isProfane || isEmail || isPhone) {
    // parsedMessage = swearWordsFilter.clean(parsedMessage);
    parsedMessage = "[ this message has been censored as it does not meet our classroom guidance ]";
  }

  return parsedMessage;
};

export default function sendGroupChatMsg(chatId, message) {
  const REDIS_CONFIG = Meteor.settings.private.redis;
  const CHANNEL = REDIS_CONFIG.channels.toAkkaApps;
  const EVENT_NAME = 'SendGroupChatMessageMsg';

  try {
    const { meetingId, requesterUserId } = extractCredentials(this.userId);

    check(meetingId, String);
    check(requesterUserId, String);
    check(chatId, String);
    check(message, Object);
    const parsedMessage = parseMessage(message.message);
    message.message = parsedMessage;

    const payload = {
      msg: message,
      chatId,
    };

    RedisPubSub.publishUserMessage(CHANNEL, EVENT_NAME, meetingId, requesterUserId, payload);
  } catch (err) {
    Logger.error(`Exception while invoking method sendGroupChatMsg ${err.stack}`);
  }
}
