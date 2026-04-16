# ══════════════════════════════════════════════
#  CloudWatch — 로그 수집 + 메트릭 + 알람
# ══════════════════════════════════════════════

# ─── Log Group: 앱 로그 (Docker awslogs 드라이버) ───
resource "aws_cloudwatch_log_group" "app" {
  name              = "/${var.project_name}/${var.environment}/app"
  retention_in_days = 30

  tags = { Name = "${var.project_name}-app-logs" }
}

# ─── EC2 IAM: CloudWatch Logs + Metrics 권한 ───
resource "aws_iam_role_policy" "ec2_cloudwatch" {
  name = "${var.project_name}-ec2-cloudwatch"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams",
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:log-group:/${var.project_name}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
        ]
        Resource = "*"
      },
    ]
  })
}

# ─── SNS Topic (알람 수신) ───
resource "aws_sns_topic" "alarm" {
  name = "${var.project_name}-${var.environment}-alarm"

  tags = { Name = "${var.project_name}-alarm-topic" }
}

resource "aws_sns_topic_subscription" "alarm_email" {
  for_each  = toset(var.alarm_emails)
  topic_arn = aws_sns_topic.alarm.arn
  protocol  = "email"
  endpoint  = each.value
}

# ─── Alarm: ALB 5xx 에러 (ALB 자체 메트릭 활용) ───
resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "${var.project_name}-${var.environment}-alb-5xx"
  alarm_description   = "5분간 ALB Target 5xx 에러 3회 이상 발생"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 3
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.app.arn_suffix
  }

  alarm_actions = [aws_sns_topic.alarm.arn]
  ok_actions    = [aws_sns_topic.alarm.arn]

  tags = { Name = "${var.project_name}-alb-5xx-alarm" }
}

# ─── Alarm: EC2 CPU 사용률 > 80% ───
resource "aws_cloudwatch_metric_alarm" "ec2_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-ec2-cpu-high"
  alarm_description   = "EC2 CPU 사용률 80% 초과 (5분 지속)"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80

  dimensions = {
    InstanceId = aws_instance.app.id
  }

  alarm_actions = [aws_sns_topic.alarm.arn]
  ok_actions    = [aws_sns_topic.alarm.arn]

  tags = { Name = "${var.project_name}-ec2-cpu-alarm" }
}

# ─── Alarm: EC2 메모리 사용률 > 80% (CloudWatch Agent 커스텀 메트릭) ───
resource "aws_cloudwatch_metric_alarm" "ec2_memory" {
  alarm_name          = "${var.project_name}-${var.environment}-ec2-memory-high"
  alarm_description   = "EC2 메모리 사용률 80% 초과 (5분 지속)"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "mem_used_percent"
  namespace           = "CWAgent"
  period              = 300
  statistic           = "Average"
  threshold           = 80

  dimensions = {
    InstanceId = aws_instance.app.id
  }

  alarm_actions = [aws_sns_topic.alarm.arn]
  ok_actions    = [aws_sns_topic.alarm.arn]

  tags = { Name = "${var.project_name}-ec2-memory-alarm" }
}

# ─── Alarm: EC2 디스크 사용률 > 85% ───
resource "aws_cloudwatch_metric_alarm" "ec2_disk" {
  alarm_name          = "${var.project_name}-${var.environment}-ec2-disk-high"
  alarm_description   = "EC2 루트 디스크 사용률 85% 초과"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "disk_used_percent"
  namespace           = "CWAgent"
  period              = 300
  statistic           = "Average"
  threshold           = 85

  dimensions = {
    InstanceId = aws_instance.app.id
    path       = "/"
    fstype     = "xfs"
  }

  alarm_actions = [aws_sns_topic.alarm.arn]
  ok_actions    = [aws_sns_topic.alarm.arn]

  tags = { Name = "${var.project_name}-ec2-disk-alarm" }
}

# ─── Alarm: RDS CPU > 80% ───
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-cpu-high"
  alarm_description   = "RDS CPU 사용률 80% 초과 (5분 지속)"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  alarm_actions = [aws_sns_topic.alarm.arn]
  ok_actions    = [aws_sns_topic.alarm.arn]

  tags = { Name = "${var.project_name}-rds-cpu-alarm" }
}

# ─── Alarm: RDS 여유 스토리지 < 5GB ───
resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-storage-low"
  alarm_description   = "RDS 여유 스토리지 5GB 미만"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5368709120 # 5GB in bytes

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  alarm_actions = [aws_sns_topic.alarm.arn]
  ok_actions    = [aws_sns_topic.alarm.arn]

  tags = { Name = "${var.project_name}-rds-storage-alarm" }
}

# ─── Alarm: RDS 연결 수 > 50 ───
resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-connections-high"
  alarm_description   = "RDS DB 연결 수 50 초과"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 50

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  alarm_actions = [aws_sns_topic.alarm.arn]
  ok_actions    = [aws_sns_topic.alarm.arn]

  tags = { Name = "${var.project_name}-rds-connections-alarm" }
}
