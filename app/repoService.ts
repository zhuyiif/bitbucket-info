import { Injectable } from '@angular/core';
import { Http,Response } from '@angular/http';
import 'rxjs/add/operator/map';

@Injectable()
export class repoService {

  private baseUrl = "http://localhost:4000/repo";

  repos: any[];
  constructor(private http:Http) {

  }

  getRepos(){

      console.log('start get url = ' + this.baseUrl);

    //    return this.http.get(this.baseUrl)
    //     .map((res: Response) => res.json())
    //         .subscribe(res => {
    //           console.log("res = " +  JSON.stringify(res));
    //           this.repos = res;
    //         });

              return this.http.get(this.baseUrl)
        .map((res: Response) => res.json());

    }
}