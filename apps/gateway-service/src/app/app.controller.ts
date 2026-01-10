import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { eventSchema } from '@analytics-event-platform/contracts';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Post('webhook')
  @HttpCode(HttpStatus.ACCEPTED)
  async handleWebhook(@Body() payload: unknown) {
    console.log('Received webhook:', payload);
    const result = eventSchema.safeParse(payload);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Invalid event payload',
        errors: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    return this.appService.handleWebhook(result.data);
  }
}
