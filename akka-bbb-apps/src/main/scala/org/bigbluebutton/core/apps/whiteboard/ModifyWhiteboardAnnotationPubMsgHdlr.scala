package org.bigbluebutton.core.apps.whiteboard

import org.bigbluebutton.core.apps.{ PermissionCheck, RightsManagementTrait }
import org.bigbluebutton.common2.msgs._
import org.bigbluebutton.core.bus.MessageBus
import org.bigbluebutton.core.running.LiveMeeting

trait ModifyWhiteboardAnnotationPubMsgHdlr extends RightsManagementTrait {
  this: WhiteboardApp2x =>

  def handle(msg: ModifyWhiteboardAnnotationPubMsg, liveMeeting: LiveMeeting, bus: MessageBus): Unit = {

    def broadcastEvent(msg: ModifyWhiteboardAnnotationPubMsg, annotations: List[AnnotationVO], userId: String, whiteboardId: String, action: String): Unit = {
      val routing = Routing.addMsgToHtml5InstanceIdRouting(liveMeeting.props.meetingProp.intId, liveMeeting.props.systemProps.html5InstanceId.toString)
      val envelope = BbbCoreEnvelope(ModifyWhiteboardAnnotationEvtMsg.NAME, routing)
      val header = BbbClientMsgHeader(ModifyWhiteboardAnnotationEvtMsg.NAME, liveMeeting.props.meetingProp.intId, msg.header.userId)

      val body = ModifyWhiteboardAnnotationEvtMsgBody(annotations, userId, whiteboardId, action)
      val event = ModifyWhiteboardAnnotationEvtMsg(header, body)
      val msgEvent = BbbCommonEnvCoreMsg(envelope, event)
      bus.outGW.send(msgEvent)
    }

    def deleteAnnotation(): Unit = {
      val sanitizedAnnotations = for (annotation <- msg.body.annotations) yield sanitizeAnnotation(annotation)
      if (filterWhiteboardMessage(msg.body.whiteBoardId, msg.header.userId, liveMeeting) && permissionFailed(PermissionCheck.GUEST_LEVEL, PermissionCheck.PRESENTER_LEVEL, liveMeeting.users2x, msg.header.userId)) {
        val meetingId = liveMeeting.props.meetingProp.intId
        val reason = "No permission to remove an annotation."
      } else {
        val deletedAnnotations = for {
          annotationToDelete <- msg.body.annotations
        } yield {
          deleteWhiteboardAnnotation(annotationToDelete, liveMeeting)
        }
        val filteredDeletedAnnotations = deletedAnnotations.filterNot(p => p.isEmpty).flatten
        broadcastEvent(msg, filteredDeletedAnnotations, msg.header.userId, msg.body.whiteBoardId, msg.body.action)
      }
    }

    msg.body.action match {
      case "delete" => deleteAnnotation()
      case "move"   => ()
    }

  }
}
